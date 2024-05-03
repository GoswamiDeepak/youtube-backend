class ApiResponce {
  constructor(statusCode, data, message = "Sccess") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { ApiResponce };
