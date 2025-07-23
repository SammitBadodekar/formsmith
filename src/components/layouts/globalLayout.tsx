import { Outlet } from "react-router";
import Providers from "../providers";

const GlobalLayout = () => {
  return (
    <div className="w-full min-h-svh">
      <Providers>
        <Outlet />
      </Providers>
    </div>
  );
};

export default GlobalLayout;
