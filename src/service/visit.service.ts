import dataSource from "../config/data-source";
import { Customer } from "../models/Customer.entity";
import { Visit } from "../models/Visits.entity";
import { Route } from "../models/Route.entity";
import httpStatusCodes from "http-status-codes";
import { MoreThanOrEqual } from "typeorm";
import axios from "axios";
require("dotenv").config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  throw new Error(
    "Google Maps API key is not defined in environment variables"
  );
}

export class VisitService {
  async planVisit(
    data: { customer_id: number; rep_id: number; date: Date },
    managerId: number
  ): Promise<{ status: number; data?: any; message: string }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const customer = await queryRunner.manager.findOne(Customer, {
        where: { customer_id: data.customer_id, assigned_rep_id: data.rep_id },
      });
      if (!customer) {
        throw new Error("Customer not assigned to rep");
      }
      const visit = await queryRunner.manager.save(Visit, {
        customer_id: data.customer_id,
        rep_id: data.rep_id,
        check_in_time: data.date,
        created_by: managerId.toString(),
      });
      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data: visit,
        message: "Visit planned successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.BAD_REQUEST,
        message: error.message,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async logVisit(data: {
    customer_id: number;
    rep_id: number;
    latitude: number;
    longitude: number;
    notes?: string;
    photo_urls?: string[];
  }): Promise<{ status: number; data?: any; message: string }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const customer = await queryRunner.manager.findOne(Customer, {
        where: { customer_id: data.customer_id, assigned_rep_id: data.rep_id },
      });
      if (!customer) {
        throw new Error("Customer not assigned to rep");
      }
      const existingVisit = await queryRunner.manager.findOne(Visit, {
        where: {
          customer_id: data.customer_id,
          check_in_time: MoreThanOrEqual(
            new Date(new Date().setHours(0, 0, 0, 0))
          ),
        },
      });
      if (existingVisit) {
        throw new Error("Duplicate visit for today");
      }
      const visit = await queryRunner.manager.save(Visit, {
        customer_id: data.customer_id,
        rep_id: data.rep_id,
        check_in_time: new Date(),
        latitude: data.latitude,
        longitude: data.longitude,
        notes: data.notes,
        photo_urls: JSON.stringify(data.photo_urls || []),
        created_by: data.rep_id.toString(),
      });
      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data: visit,
        message: "Visit logged successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.BAD_REQUEST,
        message: error.message,
      };
    } finally {
      await queryRunner.release();
    }
  }

  // Generate daily optimized route for a rep using Google Maps Directions API
  async generateDailyRoute(
    repId: number
  ): Promise<{ status: number; data?: any; message: string }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      // Check if a route already exists for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const existingRoute = await queryRunner.manager.findOne(Route, {
        where: { rep_id: repId, route_date: today },
      });

      if (existingRoute) {
        return {
          status: httpStatusCodes.OK,
          data: existingRoute,
          message: "Route already generated for today",
        };
      }

      // Fetch customers assigned to the rep
      const customers = await queryRunner.manager.find(Customer, {
        where: { assigned_rep_id: repId, is_active: true },
        relations: ["address"],
      });

      if (!customers.length) {
        throw new Error("No customers assigned to rep");
      }

      // Mock current location of the rep (in a real app, fetch from GPS)
      const repLocation = { latitude: 40.7128, longitude: -74.006 }; // New York coordinates

      // Prepare waypoints for Google Maps Directions API
      const waypoints = customers
        .filter(
          (customer) =>
            customer.address &&
            customer.address.latitude &&
            customer.address.longitude
        )
        .map(
          (customer) =>
            `${customer.address.latitude},${customer.address.longitude}`
        );

      if (waypoints.length === 0) {
        throw new Error("No valid customer addresses for route optimization");
      }

      // Call Google Maps Directions API with waypoint optimization
      const origin = `${repLocation.latitude},${repLocation.longitude}`;
      const destination = origin; // Assuming the rep returns to the starting point
      const directionsResponse = await axios.get(
        "https://maps.googleapis.com/maps/api/directions/json",
        {
          params: {
            origin,
            destination,
            waypoints: `optimize:true|${waypoints.join("|")}`,
            key: GOOGLE_MAPS_API_KEY,
            departure_time: "now", // For traffic-aware ETA
          },
        }
      );

      const directionsData = directionsResponse.data;
      if (directionsData.status !== "OK") {
        throw new Error(
          `Google Maps Directions API error: ${directionsData.status}`
        );
      }

      // Extract the optimized waypoint order
      const route = directionsData.routes[0];
      const waypointOrder = route.waypoint_order; // Array of indices in the optimized order

      // Map the optimized order back to customer IDs, distances, and ETAs
      let currentTime = new Date();
      const routeOrder = waypointOrder.map(
        (index: number, position: number) => {
          const customer = customers[index];
          const leg = route.legs[position]; // Legs are in order of travel

          // Extract distance and duration from the API response
          const distance = leg.distance.value / 1609.34; // Convert meters to miles
          const duration = leg.duration.value / 60; // Convert seconds to minutes

          // Calculate ETA
          currentTime = new Date(currentTime.getTime() + duration * 60000);
          const eta = currentTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return {
            customer_id: customer.customer_id,
            distance: Number(distance.toFixed(2)),
            eta,
          };
        }
      );

      // Add the final leg back to the starting point
      const finalLeg = route.legs[route.legs.length - 1];
      const finalDistance = finalLeg.distance.value / 1609.34;
      const finalDuration = finalLeg.duration.value / 60;
      currentTime = new Date(currentTime.getTime() + finalDuration * 60000);

      // Save the optimized route
      const newRoute = await queryRunner.manager.save(Route, {
        rep_id: repId,
        route_date: today,
        route_order: routeOrder,
        created_by: repId.toString(),
      });

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data: newRoute,
        message: "Daily route generated successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.BAD_REQUEST,
        message: error.message,
      };
    } finally {
      await queryRunner.release();
    }
  }

  // Fetch today's route for a rep
  async getDailyRoute(
    repId: number
  ): Promise<{ status: number; data?: any; message: string }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const route = await dataSource.manager.findOne(Route, {
        where: { rep_id: repId, route_date: today },
        relations: ["rep"],
      });

      if (!route) {
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "No route found for today",
        };
      }

      // Fetch customer details for the route
      const routeDetails = await Promise.all(
        route.route_order.map(
          async (item: {
            customer_id: number;
            eta: string;
            distance: number;
          }) => {
            const customer = await dataSource.manager.findOne(Customer, {
              where: { customer_id: item.customer_id },
              relations: ["address"],
            });
            return {
              customer_id: item.customer_id,
              name: customer?.name || "Unknown",
              address: customer?.address
                ? `${customer.address.street_address}, ${customer.address.city}, ${customer.address.state} ${customer.address.postal_code}`
                : "No address",
              eta: item.eta,
              distance: item.distance,
            };
          }
        )
      );

      return {
        status: httpStatusCodes.OK,
        data: routeDetails,
        message: "Today's route fetched successfully",
      };
    } catch (error: any) {
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: error.message,
      };
    }
  }

  // Refresh the daily route (re-generate)
  async refreshDailyRoute(
    repId: number
  ): Promise<{ status: number; data?: any; message: string }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await queryRunner.manager.delete(Route, {
        rep_id: repId,
        route_date: today,
      });
      await queryRunner.commitTransaction();

      // Re-generate the route
      return await this.generateDailyRoute(repId);
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: error.message,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
