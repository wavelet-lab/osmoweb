#!/usr/bin/env bash

PROMETHEUS_DIR="./prometheus"
INFLUXDB_DIR="./influxdb"
GRAFANA_DIR="./grafana"

cur_dir=$(pwd)

cd ${GRAFANA_DIR}
docker compose -f docker-compose.yml down
cd ${cur_dir}

cd ${INFLUXDB_DIR}
docker compose -f docker-compose.yml down
cd ${cur_dir}

cd ${PROMETHEUS_DIR}
docker compose -f docker-compose.yml down
cd ${cur_dir}
