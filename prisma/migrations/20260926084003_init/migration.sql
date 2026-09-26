-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('ORDER_BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'HUB_REACHED', 'OUT_FOR_DELIVERY', 'DELIVERED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('MOVING', 'IDLE', 'STOPPED', 'OFFLINE');

-- CreateEnum
CREATE TYPE "HubStatus" AS ENUM ('NORMAL', 'BUSY', 'CONGESTED');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('DELAY_RISK', 'HUB_DWELL', 'NO_MOVEMENT', 'ROUTE_DEVIATION', 'TRAFFIC', 'STALE_GPS', 'MISSED_MILESTONE');

-- CreateEnum
CREATE TYPE "ExceptionSeverity" AS ENUM ('INFO', 'WARNING', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ExceptionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "NotificationTemplate" AS ENUM ('SHIPMENT_UPDATE', 'DELAY_NOTICE', 'REVISED_ETA', 'TRACKING_LINK');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('TRIGGERED', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('DEMO', 'TMS', 'WMS', 'GPS_PROVIDER', 'HUB_SYSTEM');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "homeHubId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hub" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "HubStatus" NOT NULL DEFAULT 'NORMAL',
    "arrivals" INTEGER NOT NULL DEFAULT 0,
    "departures" INTEGER NOT NULL DEFAULT 0,
    "activeShipments" INTEGER NOT NULL DEFAULT 0,
    "averageDwellMinutes" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "corridor" TEXT NOT NULL,
    "plannedDistanceKm" INTEGER NOT NULL,
    "plannedDurationMinutes" INTEGER NOT NULL,
    "geometry" JSONB NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "routeId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "hubId" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("routeId","sequence")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "homeHubId" TEXT NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'IDLE',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "headingDeg" DOUBLE PRECISION,
    "speedKph" DOUBLE PRECISION,
    "lastGpsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GpsPoint" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speedKph" DOUBLE PRECISION,
    "headingDeg" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "source" "DataSource" NOT NULL,
    "externalEventId" TEXT,

    CONSTRAINT "GpsPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "publicTrackingToken" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "status" "ShipmentStatus" NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "originLat" DOUBLE PRECISION NOT NULL,
    "originLng" DOUBLE PRECISION NOT NULL,
    "destinationLat" DOUBLE PRECISION NOT NULL,
    "destinationLng" DOUBLE PRECISION NOT NULL,
    "bookedAt" TIMESTAMP(3) NOT NULL,
    "pickedUpAt" TIMESTAMP(3),
    "promisedDeliveryAt" TIMESTAMP(3) NOT NULL,
    "originalEtaAt" TIMESTAMP(3) NOT NULL,
    "revisedEtaAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "currentRecordedAt" TIMESTAMP(3),
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "currentHubId" TEXT,
    "nextHubId" TEXT,
    "locationLabel" TEXT,
    "delayReason" TEXT,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "locationLabel" TEXT,
    "hubId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "source" "DataSource" NOT NULL,
    "externalEventId" TEXT,

    CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HubVisit" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "hubId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "arrivedAt" TIMESTAMP(3),
    "departedAt" TIMESTAMP(3),
    "dwellMinutes" INTEGER,
    "status" TEXT NOT NULL,

    CONSTRAINT "HubVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtaPrediction" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "predictedEtaAt" TIMESTAMP(3) NOT NULL,
    "previousEtaAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "delayMinutes" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "bufferMinutes" INTEGER NOT NULL,
    "factors" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "dataFreshnessAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtaPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exception" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "type" "ExceptionType" NOT NULL,
    "severity" "ExceptionSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "status" "ExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "vehicleId" TEXT,
    "hubId" TEXT,
    "affectedShipmentIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExceptionAudit" (
    "id" TEXT NOT NULL,
    "exceptionId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" "ExceptionStatus",
    "toStatus" "ExceptionStatus",
    "fromAssignee" TEXT,
    "toAssignee" TEXT,
    "note" TEXT,
    "at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExceptionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT,
    "template" "NotificationTemplate" NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "provider" TEXT NOT NULL DEFAULT 'DEMO',
    "status" "NotificationStatus" NOT NULL,
    "severity" "NotificationSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "dedupeKey" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiSnapshot" (
    "date" TEXT NOT NULL,
    "etaAccuracy" DOUBLE PRECISION NOT NULL,
    "otif" DOUBLE PRECISION NOT NULL,
    "avgDelayResponseMinutes" INTEGER NOT NULL,
    "customerQueries" INTEGER NOT NULL,
    "avgHubDwellMinutes" INTEGER NOT NULL,
    "routeExceptions" INTEGER NOT NULL,

    CONSTRAINT "KpiSnapshot_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hub_code_key" ON "Hub"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vehicleNumber_key" ON "Vehicle"("vehicleNumber");

-- CreateIndex
CREATE INDEX "GpsPoint_vehicleId_recordedAt_idx" ON "GpsPoint"("vehicleId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GpsPoint_source_externalEventId_key" ON "GpsPoint"("source", "externalEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_trackingNumber_key" ON "Shipment"("trackingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_publicTrackingToken_key" ON "Shipment"("publicTrackingToken");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "Shipment_riskLevel_idx" ON "Shipment"("riskLevel");

-- CreateIndex
CREATE INDEX "Shipment_customerId_idx" ON "Shipment"("customerId");

-- CreateIndex
CREATE INDEX "Shipment_vehicleId_idx" ON "Shipment"("vehicleId");

-- CreateIndex
CREATE INDEX "Shipment_bookedAt_idx" ON "Shipment"("bookedAt");

-- CreateIndex
CREATE INDEX "ShipmentEvent_shipmentId_occurredAt_idx" ON "ShipmentEvent"("shipmentId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentEvent_source_externalEventId_key" ON "ShipmentEvent"("source", "externalEventId");

-- CreateIndex
CREATE INDEX "HubVisit_hubId_idx" ON "HubVisit"("hubId");

-- CreateIndex
CREATE INDEX "HubVisit_shipmentId_idx" ON "HubVisit"("shipmentId");

-- CreateIndex
CREATE INDEX "EtaPrediction_shipmentId_generatedAt_idx" ON "EtaPrediction"("shipmentId", "generatedAt");

-- CreateIndex
CREATE INDEX "Exception_status_severity_idx" ON "Exception"("status", "severity");

-- CreateIndex
CREATE INDEX "Exception_detectedAt_idx" ON "Exception"("detectedAt");

-- CreateIndex
CREATE INDEX "ExceptionAudit_exceptionId_at_idx" ON "ExceptionAudit"("exceptionId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsPoint" ADD CONSTRAINT "GpsPoint_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubVisit" ADD CONSTRAINT "HubVisit_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubVisit" ADD CONSTRAINT "HubVisit_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtaPrediction" ADD CONSTRAINT "EtaPrediction_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exception" ADD CONSTRAINT "Exception_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionAudit" ADD CONSTRAINT "ExceptionAudit_exceptionId_fkey" FOREIGN KEY ("exceptionId") REFERENCES "Exception"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
