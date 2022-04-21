#!/bin/sh

BUILD=$(find Dockerfile -newer $0)

if [ "$BUILD" != "" ]; then
    docker build --pull -t local/vhs-sergeant .
    touch $0
fi

docker run \
    -it \
    --rm \
    --name vhs-sergeant \
    -e DEBUG=* \
    -e MQTT_URI=tcp://test.mosquitto.org:1883/ \
    -e MQTT_SUB=/test/events/phone/ring:phone \
    -e MQTT_TOPIC=/test/status/space/sergeant \
    -e MQTT_INTERVAL=60000 \
    -e TZ=America/Vancouver \
    -v $(pwd):/app \
    local/vhs-sergeant
