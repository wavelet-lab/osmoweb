#!/usr/bin/env bash

PROMETHEUS_DIR="./prometheus"
INFLUXDB_DIR="./influxdb"
GRAFANA_DIR="./grafana"

cur_dir=$(pwd)

cd ${PROMETHEUS_DIR}
docker compose -f docker-compose.yml up -d
cd ${cur_dir}

cd ${INFLUXDB_DIR}
docker compose -f docker-compose.yml up -d
cd ${cur_dir}

cd ${GRAFANA_DIR}
docker compose -f docker-compose.yml up -d
cd ${cur_dir}

