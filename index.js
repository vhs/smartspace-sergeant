const MQTT = require('async-mqtt')

const quietTimes = {
  '0': { 10: 'green', 18: 'orange', 20: 'red' },
  '1': { 8: 'green', 20: 'orange', 22: 'red' },
  '2': { 8: 'green', 20: 'orange', 22: 'red' },
  '3': { 8: 'green', 20: 'orange', 22: 'red' },
  '4': { 8: 'green', 20: 'orange', 22: 'red' },
  '5': { 8: 'green', 20: 'orange', 22: 'red' },
  '6': { 10: 'green', 18: 'orange', 20: 'red' }
}

// Functions
const handleError = async (msg) => {
  console.log(msg)
  process.exit()
}

const updateStatus = async (overrideStatus) => {
  console.log('updateStatus', 'Running ...')
  try {
    var newStatus = 'red'
    if (overrideStatus !== undefined) {
      console.log('updateStatus', 'Overriding status to:', overrideStatus)
      newStatus = overrideStatus
    } else {
      console.log('updateStatus', 'Checking window')
      var d = new Date()
      var dow = d.getDay()
      var hod = d.getHours()
      Object.keys(quietTimes[dow]).forEach(function (slot) {
        if (hod > quietTimes[dow][slot]) {
          console.log('updateStatus', 'Found window for:', hod, '/', slot)
          newStatus = quietTimes[dow][slot]
        }
      })
    }
    if (newStatus !== lastStatus || ((Date.now() - lastUpdateSent) > MQTT_INTERVAL)) {
      console.log('updateStatus', 'Updating from', lastStatus, 'to', newStatus, '-', ((Date.now() - lastUpdateSent) > MQTT_INTERVAL))
      await client.publish(MQTT_TOPIC, newStatus)
      lastStatus = newStatus
      lastUpdateSent = Date.now()
    }
  } catch (e) {
    handleError(e.stack)
  }
}

const onConnect = async () => {
  console.log('onConnect', 'Online')
  console.log('onConnect', 'Subscribing to topics:')
  console.log('onConnect', MQTT_SUB)
  MQTT_SUB.split(';').forEach(function (subscription) {
    let subscriptionDetails = subscription.split(':')
    console.log('onConnect', 'Subscribing to', subscriptionDetails[0], '=>', subscriptionDetails[1])
    topics[subscriptionDetails[0]] = subscriptionDetails[1]
    client.subscribe(subscriptionDetails[0])
  })
}

const onMessage = async (topic, message, packet) => {
  console.log('onMessage', 'Handling', topic, '=>', message)
  if (topics.hasOwnproperty(topic)) {
    updateStatus(topics[topic])
  }
}

// Main
const MQTT_URI = process.env.MQTT_URI || handleError('Missing MQTT_URI')
const MQTT_SUB = process.env.MQTT_SUB || handleError('Missing MQTT_SUB')
const MQTT_TOPIC = process.env.MQTT_TOPIC || handleError('Missing MQTT_TOPIC')
const MQTT_INTERVAL = process.env.MQTT_INTERVAL ? parseInt(process.env.MQTT_INTERVAL) : 60000

var lastStatus = 'red'
var lastUpdateSent = Date.now()

var topics = {}

const client = MQTT.connect(MQTT_URI)

client.on('connect', onConnect)
client.on('message', onMessage)

setInterval(updateStatus, 1000)
