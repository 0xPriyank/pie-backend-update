import type { Request, Response } from "express";

import { AxiosError } from "axios";
import { DaakitClient } from "@/config/daakitClient";
import {
  ratePayloadSchema,
  serviceabilitySchema,
  warehousePayloadSchema,
  orderShipmentSchema,
  awbArraySchema,
  awbSingleSchema
} from "@/schemas/shipping.schema";
import { PincodeServiceability } from "@/types/daakit";

const daakitClient = new DaakitClient("https://api.daakit.com");

export const getCouriers = async (_req: Request, res: Response) => {
  try {
    const couriers = await daakitClient.getCouriers();
    res.json(couriers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch couriers" });
  }
};

export const getRates = async (req: Request, res: Response) => {
  try {
    const parseResult = ratePayloadSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ errors: parseResult.error.errors });
    }

    const rates = await daakitClient.getRates(parseResult.data);
    if (rates.length === 0) return res.status(404).json({ message: "No couriers found" });

    const showCheapest = req.query.cheapest === "true";
    if (showCheapest) {
      const cheapest = rates.reduce((prev, curr) =>
        prev.totalCharges < curr.totalCharges ? prev : curr
      );
      return res.json(cheapest);
    }

    res.json(rates);
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data)
      return res.status(error.response.status).json(error.response.data);
    res.status(500).json({ message: "Failed to fetch rates" });
  }
};

const filterByPincode = (
  serviceabilityList: PincodeServiceability[],
  pincode: string,
  res: Response
) => {
  const availableCouriers = serviceabilityList.filter(
    (courier) => courier.pincode && courier.pincode.includes(pincode)
  );

  if (availableCouriers.length === 0) {
    return res.status(404).json({ message: "No couriers serviceable for this pincode" });
  }

  return res.json(availableCouriers);
};

const filterByCourier = (
  serviceabilityList: PincodeServiceability[],
  pincode: string | undefined,
  courierId: string,
  res: Response
) => {
  const courier = serviceabilityList.find((c) => c.courierId === courierId);

  if (!courier) {
    return res.status(404).json({ message: "Courier not found" });
  }

  if (pincode && !courier.pincode.includes(pincode)) {
    return res.status(404).json({ message: "Courier does not service this pincode" });
  }

  return res.json(courier);
};

export const checkServiceability = async (req: Request, res: Response) => {
  const parseResult = serviceabilitySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.errors });
  }

  const { filterType, pincode, courierId } = parseResult.data;

  let serviceability: PincodeServiceability[];
  try {
    serviceability = await daakitClient.checkServiceability();
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      const status = error.response.status || 500;
      return res.status(status).json(error.response.data);
    }
    console.error("Failed to fetch serviceability:", error);
    return res
      .status(500)
      .json({ message: "Failed to check serviceability due to an internal server error." });
  }

  switch (filterType as "pincode" | "courier" | undefined) {
    case "pincode":
      if (!pincode) {
        return res
          .status(400)
          .json({ message: "pincode is required when filterType is 'pincode'" });
      }
      return filterByPincode(serviceability, pincode, res);

    case "courier":
      if (!courierId) {
        return res
          .status(400)
          .json({ message: "courierId is required when filterType is 'courier'" });
      }
      return filterByCourier(serviceability, pincode, courierId, res);

    default:
      return res.json(serviceability);
  }
};

export const createWarehouse = async (req: Request, res: Response) => {
  try {
    const parseResult = warehousePayloadSchema.safeParse(req.body);
    if (!parseResult.success) return res.status(400).json({ errors: parseResult.error.errors });

    const warehouse = await daakitClient.createWarehouse(parseResult.data);
    res.json(warehouse);
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data)
      return res.status(error.response.status).json(error.response.data);
    res.status(500).json({ message: "Failed to create warehouse" });
  }
};

export const createOrderShipment = async (req: Request, res: Response) => {
  try {
    const parseResult = orderShipmentSchema.safeParse(req.body);
    if (!parseResult.success) return res.status(400).json({ errors: parseResult.error.errors });

    const shipment = await daakitClient.createOrderShipment(parseResult.data);
    res.json(shipment);
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data)
      return res.status(error.response.status).json(error.response.data);
    res.status(500).json({ message: "Failed to create order shipment" });
  }
};

export const trackShipment = async (req: Request, res: Response) => {
  try {
    const { awbNumber } = req.params;
    const parseResult = awbSingleSchema.safeParse({ awbNumber });
    if (!parseResult.success) return res.status(400).json({ errors: parseResult.error.errors });

    const shipment = await daakitClient.trackShipment(awbNumber);
    res.json(shipment);
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data)
      return res.status(error.response.status).json(error.response.data);
    res.status(500).json({ message: "Failed to track shipment" });
  }
};

export const createManifest = async (req: Request, res: Response) => {
  try {
    const parseResult = awbArraySchema.safeParse(req.body);
    if (!parseResult.success) return res.status(400).json({ errors: parseResult.error.errors });

    const manifest = await daakitClient.createManifest(parseResult.data);
    res.json(manifest);
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data)
      return res.status(error.response.status).json(error.response.data);
    res.status(500).json({ message: "Failed to create manifest" });
  }
};

export const cancelShipment = async (req: Request, res: Response) => {
  try {
    const parseResult = awbSingleSchema.safeParse(req.body);
    if (!parseResult.success) return res.status(400).json({ errors: parseResult.error.errors });

    const result = await daakitClient.cancelShipment(parseResult.data);
    res.json(result);
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data)
      return res.status(error.response.status).json(error.response.data);
    res.status(500).json({ message: "Failed to cancel shipment" });
  }
};

export const createLabel = async (req: Request, res: Response) => {
  try {
    const parseResult = awbArraySchema.safeParse(req.body);
    if (!parseResult.success) return res.status(400).json({ errors: parseResult.error.errors });

    const result = await daakitClient.createLabel(parseResult.data);
    res.json(result);
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data)
      return res.status(error.response.status).json(error.response.data);
    res.status(500).json({ message: "Failed to create labels" });
  }
};
