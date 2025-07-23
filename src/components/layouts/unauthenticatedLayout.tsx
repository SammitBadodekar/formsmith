import { Outlet } from "react-router";
import { Unauthenticated } from "../auth";

const UnauthenticatedLayout = () => {
  return (
    <Unauthenticated>
      <Outlet />
    </Unauthenticated>
  );
};

export default UnauthenticatedLayout;
