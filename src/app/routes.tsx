import { createBrowserRouter, Outlet } from "react-router";
import { Home } from "./pages/Home";

function Root() {
  return (
    <div className="font-sans antialiased">
      <Outlet />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
    ],
  },
]);
