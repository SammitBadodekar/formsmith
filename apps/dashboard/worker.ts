import { handleGatewayRequest } from "./gateway";

export default {
  fetch: handleGatewayRequest,
} satisfies ExportedHandler<Env>;
