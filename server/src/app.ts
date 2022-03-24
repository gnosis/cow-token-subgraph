import express from "express";
import routes from "./routes";

class App {
  public server;

  constructor() {
    this.server = express();
    this.routes();
  }

  routes() {
    this.server.use(routes);
  }
}

export default new App().server;
