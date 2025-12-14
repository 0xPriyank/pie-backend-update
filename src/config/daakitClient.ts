/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance, AxiosError } from "axios";
import { env } from "./env";
import {
  CancelShipmentPayload,
  CancelShipmentResponse,
  Courier,
  CourierRate,
  CreateLabelPayload,
  CreateLabelResponse,
  CreateManifestPayload,
  CreateManifestResponse,
  LoginResponse,
  OrderShipmentPayload,
  OrderShipmentResponse,
  PincodeServiceability,
  RatePayload,
  TrackShipmentResponse,
  WarehousePayload,
  WarehouseResponse
} from "@/types/daakit";

export class DaakitClient {
  private readonly axiosInstance: AxiosInstance;
  private token: string | null = null;
  private readonly maxRetries = 3;

  constructor(baseUrl: string) {
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Centralized request handler with retry & token refresh
  private async requestWithRetry<T>(
    method: "get" | "post",
    url: string,
    data: any = {},
    requiresAuth = true,
    retries = 0
  ): Promise<T> {
    try {
      const headers: Record<string, string> = {};
      if (requiresAuth) {
        if (!this.token) await this.login();
        headers.Authorization = `Bearer ${this.token}`;
      }
      const response = await this.axiosInstance.request<T>({ method, url, data, headers });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        // Refresh token on 401
        if (error.response?.status === 401 && retries < this.maxRetries) {
          await this.login();
          return this.requestWithRetry<T>(method, url, data, requiresAuth, retries + 1);
        }
      }
      if (retries < this.maxRetries) {
        return this.requestWithRetry<T>(method, url, data, requiresAuth, retries + 1);
      }
      throw error;
    }
  }

  // Login & store token
  async login(userName = env.DAAKIT_USERNAME || "", password = env.DAAKIT_PASSWORD || ""): Promise<void> {
    const response = await this.requestWithRetry<LoginResponse>(
      "post",
      "/api/token",
      { user_name: userName, password },
      false
    );
    this.token = response.data;
  }

  // Couriers
  async getCouriers(): Promise<Courier[]> {
    const response = await this.requestWithRetry<{ data: Courier[] }>("post", "/api/courier", {
      filterType: "courier"
    });
    return response.data;
  }

  async getRates(payload: RatePayload): Promise<CourierRate[]> {
    const requestBody = {
      filterType: "rate",
      origin: payload.origin,
      destination: payload.destination,
      paymentType: payload.paymentType,
      orderAmount: payload.orderAmount.toString(),
      length: payload.dimensions.length.toString(),
      breadth: payload.dimensions.breadth.toString(),
      height: payload.dimensions.height.toString(),
      weight: payload.weight.toString()
    };
    const response = await this.requestWithRetry<{ data: CourierRate[] }>(
      "post",
      "/api/courierrate",
      requestBody
    );
    return response.data;
  }

  async checkServiceability(): Promise<PincodeServiceability[]> {
    const requestBody = {
      filterType: "pincode"
    };
    const response = await this.requestWithRetry<{ data: PincodeServiceability[] }>(
      "post",
      "/api/courierpincodeserviceability",
      requestBody
    );
    return response.data;
  }

  // Warehouse
  async createWarehouse(payload: WarehousePayload): Promise<WarehouseResponse> {
    return this.requestWithRetry<WarehouseResponse>("post", "/api/createwarehouse", payload);
  }

  // Orders / Shipments
  async createOrderShipment(payload: OrderShipmentPayload): Promise<OrderShipmentResponse> {
    return this.requestWithRetry<OrderShipmentResponse>(
      "post",
      "/api/createordershipment",
      payload
    );
  }

  async trackShipment(awbNumber: string): Promise<TrackShipmentResponse> {
    return this.requestWithRetry<TrackShipmentResponse>("get", `/api/trackshipment/${awbNumber}`);
  }

  async createManifest(payload: CreateManifestPayload): Promise<CreateManifestResponse> {
    return this.requestWithRetry<CreateManifestResponse>("post", "/api/createmanifest", payload);
  }

  async cancelShipment(payload: CancelShipmentPayload): Promise<CancelShipmentResponse> {
    return this.requestWithRetry<CancelShipmentResponse>("post", "/api/cancelshipment", payload);
  }

  async createLabel(payload: CreateLabelPayload): Promise<CreateLabelResponse> {
    return this.requestWithRetry<CreateLabelResponse>("post", "/api/createLabel", payload);
  }
}
