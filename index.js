const convict = require('convict')
const MQTT = require('async-mqtt')
const debug = require('debug')('sergeant')

debug('Starting...')

// Configurables
const quietTimes = {
  '0': { 10: 'green', 18: 'orange', 20: 'red' },
  '1': { 8: 'green', 18: 'orange', 20: 'red' },
  '2': { 8: 'green', 18: 'orange', 20: 'red' },
  '3': { 8: 'green', 18: 'orange', 20: 'red' },
  '4': { 8: 'green', 18: 'orange', 20: 'red' },
  '5': { 8: 'green', 18: 'orange', 20: 'red' },
  '6': { 10: 'green', 18: 'orange', 20: 'red' }
}

// Config
const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  mqtt_uri: {
    doc: 'The MQTT uri to connect to.',
    format: (s) => {
      try {
        // eslint-disable-next-line no-new
        new URL(s)
        return true
      } catch (err) {
        return false
      }
    },
    default: 'tcp://test.mosquitto.org:1883',
    env: 'MQTT_URI'
  },
  mqtt_sub: {
    doc: 'The MQTT topics to subscribe and proxy to: /topic:status[;/topic:status]',
    format: String,
    default: '/test/vanhack/sergeant/events/phone/ring:phone',
    env: 'MQTT_SUB'
  },
  mqtt_topic: {
    doc: 'The MQTT topic to write to: /topic',
    format: String,
    default: '/test/vanhack/sergeant/status/space/sergeant',
    env: 'MQTT_TOPIC'
  },
  mqtt_interval: {
    doc: 'The MQTT update interval.',
    format: 'int',
    default: 60000,
    env: 'MQTT_INTERVAL'
  }
})

// Variables
let curDate = new Date()
let dayOfWeek = 0
let hourOfDay = 0

let superStatus = 0

let newStatus = 'red'
let lastStatus = 'red'
let lastUpdateSent = 0

let mqttInterval = 0

const topics = {}

// Functions
const customLog = (name, ...log) => {
  debug.extend(name)(...log)
}

const handleError = (msg) => {
  customLog('handleError', msg)
  process.exit()
}

const updateStatus = async (overrideStatus) => {
  customLog('updateStatus', 'Running ...')

  try {
    let forceUpdate = ((Date.now() - lastUpdateSent) > mqttInterval)

    if (overrideStatus !== undefined) {
      customLog('updateStatus', 'Overriding status to:', overrideStatus)
      newStatus = overrideStatus
      superStatus = 1
    }

    if (superStatus) {
      superStatus++
      if (superStatus > 2) {
        superStatus = 0
        newStatus = 'red'
        forceUpdate = true
      }
    }

    if (forceUpdate) {
      customLog('updateStatus', 'Checking window...')

      newStatus = 'red'
      curDate = new Date()
      dayOfWeek = curDate.getDay()
      hourOfDay = curDate.getHours()

      Object.keys(quietTimes[dayOfWeek]).forEach((slot) => {
        if (hourOfDay >= parseInt(slot)) {
          customLog('updateStatus', 'Found window for:', hourOfDay, '/', slot)

          newStatus = quietTimes[dayOfWeek][slot]
        }
      })
    }
    if (newStatus !== lastStatus || forceUpdate) {
      customLog('updateStatus', 'Updating from', lastStatus, 'to', newStatus, '-', forceUpdate)

      await client.publish(config.get('mqtt_topic'), newStatus)

      lastStatus = newStatus
      lastUpdateSent = Date.now()
    }
  } catch (e) {
    handleError(e.stack)
  }
}

const onConnect = async () => {
  customLog('onConnect', 'Online')

  const subTopics = config.get('mqtt_sub').split(';')

  customLog('onConnect', 'Subscribing to topics:')
  customLog('onConnect', config.get('mqtt_sub'))

  subTopics.forEach((subscription) => {
    let subscriptionDetails = subscription.split(':')

    customLog('onConnect', 'Subscribing to', subscriptionDetails[0], '=>', subscriptionDetails[1])

    topics[subscriptionDetails[0]] = subscriptionDetails[1]

    client.subscribe(subscriptionDetails[0])
  })

  customLog('onConnect', 'Subscribed to topics:', topics)

  customLog('onConnect', 'Forcing initial update')
  updateStatus()

  mqttInterval = (config.get('mqtt_interval') < 1000) ? (config.get('mqtt_interval') * 1000) : config.get('mqtt_interval')

  setInterval(updateStatus, 1000)
}

const onMessage = async (topic, message, packet) => {
  customLog('onMessage', 'Handling', topic, '=>', message)

  if (topics[topic] !== undefined) {
    updateStatus(topics[topic])
  } else {
    customLog('onMessage', 'Missing topic', topic)
  }
}

// Main
customLog('main', 'Starting...')
customLog('main', 'Connecting to', config.get('mqtt_uri'))
const client = MQTT.connect(config.get('mqtt_uri'))

client.on('connect', onConnect)
client.on('message', onMessage)
