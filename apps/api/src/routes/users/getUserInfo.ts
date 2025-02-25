import { Context } from "hono";
import axios from "axios";
import { getCookie } from "hono/cookie";
import { getDB } from "../../helpers";
import { eq } from "drizzle-orm";

export const getUserInfo = async (c: Context) => {
  try {
    return c.json({
      success: true,
    });
  } catch (error) {
    console.log("error", error);
    return c.json({
      success: false,
      error: error,
    });
  }
};
