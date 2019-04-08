const MQTT = require('async-mqtt')

const silence_times = {
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

const onConnect = async () => {
  console.log('onConnect', 'Online')
  console.log('onConnect', 'Subscribing to topics...')
  MQTT_SUB.split(';').forEach(function (subscription) {
    var { eventTopic, eventName } = subscription.split(':')
    console.log('onConnect','Subscribing to', eventTopic, '=>', eventName)
    topics[eventTopic] = eventName
    client.subscribe(eventTopic)
  })
}

const onMessage = async (topic, message, packet) => {
  console.log('onMessage', 'Handling', topic, '=>', message)
  if (topics.hasOwnproperty(topic)) { await client.publish(MQTT_TOPIC, topics[topic]) }
}

const updateStatus = async () => {
  console.log('updateStatus', 'Running ...')
  try {
    var newStatus = 'red'
    var d = new Date()
    var dow = d.getDay()
    var hod = d.getHours()
    Object.keys(silence_times[dow]).forEach(function (slot) {
      if (hod > silence_times[dow][slot]) { newStatus = silence_times[dow][hod] }
    })
    if (newStatus !== lastStatus || MQTT_INTERVAL) {
      console.log('updateStatus', 'Updating from', lastStatus, 'to', newStatus)
      await client.publish(MQTT_TOPIC, newStatus)
      lastStatus = newStatus
      lastUpdateSent = Date.now()
    }
  } catch (e) {
    handleError(e.stack)
  }
}

// Main
const MQTT_URI = process.env.MQTT_URI || handleError('Missing MQTT_URI')
const MQTT_SUB = process.env.MQTT_SUB || handleError('Missing MQTT_SUB')
const MQTT_TOPIC = process.env.MQTT_TOPIC || handleError('Missing MQTT_TOPIC')
const MQTT_INTERVAL = process.env.MQTT_INTERVAL ? () => { return ((Date.now() - lastUpdateSent) > process.env.MQTT_INTERVAL) } : false

var lastStatus = ''
var lastUpdateSent = 0

var topics = {}

const client = MQTT.connect(MQTT_URI)

client.on('connect', onConnect)
client.on('message', onMessage)

setInterval(updateStatus, 1000)
