import App from "./App.tsx";
import { renderToString } from "react-dom/server";

export function render() {
  return renderToString(<App />);
}
