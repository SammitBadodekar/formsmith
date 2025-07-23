import { Authenticated } from "../auth";
import { Outlet } from "react-router";

const AuthenticatedLayout = () => {
  return (
    <Authenticated>
      <Outlet />
    </Authenticated>
  );
};

export default AuthenticatedLayout;
