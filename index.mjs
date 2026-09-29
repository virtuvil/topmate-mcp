import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = "https://api.galactus.run";

function getAuthHeaders() {
  const token = process.env.TOPMATE_TOKEN;
  const deviceId = process.env.TOPMATE_DEVICE_ID;

  if (!token) {
    throw new Error("Missing TOPMATE_TOKEN environment variable. Please set it in your MCP configuration.");
  }

  return {
    "accept": "application/json, text/plain, */*",
    "authorization": `Token ${token}`,
    "origin": "https://topmate.io",
    "referer": "https://topmate.io/",
    "content-type": "application/json",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    ...(deviceId ? { "x-device-id": deviceId } : {})
  };
}

async function request(endpoint, options = {}) {
  const headers = getAuthHeaders();
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });

  const contentType = response.headers.get("content-type") || "";
  let data;
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = typeof data === "object" ? JSON.stringify(data) : data;
    throw new Error(`Topmate API error (${response.status}): ${errorMsg}`);
  }

  return data;
}

const server = new McpServer({
  name: "topmate-mcp",
  version: "1.0.0"
});

// Tool 1: Get Profile & Metrics
server.tool(
  "topmate_get_profile",
  "Fetches the authenticated Topmate creator profile, metrics, bookings count, and settings",
  {},
  async () => {
    try {
      const profile = await request("/profile/");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              id: profile.id,
              username: profile.username,
              title: profile.title,
              description: profile.description,
              bookings_count: profile.bookings_count,
              ratings_count: profile.ratings_count,
              notice_period: profile.notice_period,
              buffer: profile.buffer,
              theme_details: profile.theme_details,
              ppp_enabled: profile.ppp_enabled_user_level,
              social_urls: profile.social_urls
            }, null, 2)
          }
        ]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to fetch profile: ${err.message}` }]
      };
    }
  }
);

// Tool 2: List Services
server.tool(
  "topmate_list_services",
  "Lists all creator services, pricing, durations, strikeout anchors, and statuses",
  {},
  async () => {
    try {
      const services = await request("/services/");
      const summary = services.map(s => ({
        id: s.id,
        title: s.title,
        charge: s.charge,
        custom_price: s.custom_price,
        duration: s.duration,
        type: s.type,
        is_active: s.is_active,
        tags: s.tags
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(summary, null, 2)
          }
        ]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to list services: ${err.message}` }]
      };
    }
  }
);

// Tool 3: Update Service Details & Pricing
server.tool(
  "topmate_update_service",
  "Updates an existing Topmate service (pricing, strikeout anchor, duration, title, description)",
  {
    service_id: z.number().describe("The numerical ID of the service to update"),
    charge: z.number().optional().describe("Store price in INR (e.g. 2999)"),
    custom_price: z.number().optional().describe("Psychological strikeout anchor price (e.g. 3500)"),
    title: z.string().optional().describe("Service title"),
    duration: z.number().optional().describe("Call duration in minutes"),
    description: z.string().optional().describe("Full HTML/plain text description of the service")
  },
  async ({ service_id, charge, custom_price, title, duration, description }) => {
    try {
      const payload = {};
      if (charge !== undefined) payload.charge = charge;
      if (custom_price !== undefined) payload.custom_price = custom_price;
      if (title !== undefined) payload.title = title;
      if (duration !== undefined) payload.duration = duration;
      if (description !== undefined) payload.description = description;

      const updated = await request(`/service/${service_id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      return {
        content: [
          {
            type: "text",
            text: `Successfully updated service ${service_id}: ${updated.title} (Charge: ₹${updated.charge}, Strikeout: ~₹${updated.custom_price}~)`
          }
        ]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to update service: ${err.message}` }]
      };
    }
  }
);

// Tool 4: Update Theme Color
server.tool(
  "topmate_update_theme",
  "Updates the Topmate profile accent/background theme color",
  {
    hex_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-character hex color (e.g. #80C4FF)").describe("Hex color code")
  },
  async ({ hex_color }) => {
    try {
      const payload = {
        theme_details: {
          theme: hex_color,
          backgroundColor: hex_color
        }
      };

      const res = await request("/profile/", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      return {
        content: [
          {
            type: "text",
            text: `Theme successfully updated to ${hex_color}`
          }
        ]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to update theme: ${err.message}` }]
      };
    }
  }
);

// Tool 5: Configure Exit-Intent Popup & Announcement Bar
server.tool(
  "topmate_configure_popup",
  "Configures the Topmate exit-intent discount popup and top announcement banner",
  {
    enable_popup: z.boolean().describe("Whether the discount popup is enabled"),
    coupon_code: z.string().describe("Coupon code to apply (e.g. SECURITY15)"),
    discount_percentage: z.number().min(1).max(100).describe("Discount percentage"),
    popup_title: z.string().describe("Title shown on the popup modal"),
    popup_description: z.string().describe("Description shown on the popup modal"),
    enable_announcement_bar: z.boolean().describe("Whether the top announcement banner is enabled"),
    announcement_message: z.string().describe("Message displayed on the top banner")
  },
  async ({ enable_popup, coupon_code, discount_percentage, popup_title, popup_description, enable_announcement_bar, announcement_message }) => {
    try {
      const payload = {
        offer_popup: {
          enabled: enable_popup,
          title: popup_title,
          description: popup_description,
          coupon_code: coupon_code,
          discount_percentage: discount_percentage,
          trigger_mode: "exit_intent",
          delay_seconds: 8,
          show_avatar: true,
          show_rating: true,
          reshow_interval_minutes: 1440
        },
        announcement_bar: {
          enabled: enable_announcement_bar,
          message: announcement_message,
          position: "top",
          cta_label: "Apply Coupon",
          dismissible: true
        }
      };

      await request("/profile/popups/", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      return {
        content: [
          {
            type: "text",
            text: `Popup and Announcement Bar settings successfully updated.`
          }
        ]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to update popups: ${err.message}` }]
      };
    }
  }
);

// Tool 6: List Bookings
server.tool(
  "topmate_list_bookings",
  "Fetches upcoming and past bookings",
  {},
  async () => {
    try {
      const bookings = await request("/bookings/");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(bookings, null, 2)
          }
        ]
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to fetch bookings: ${err.message}` }]
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Topmate MCP Server running on stdio");
}

main().catch(console.error);
