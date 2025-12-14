/* eslint-disable @typescript-eslint/no-explicit-any */
class ApiResponse {
  statusCode: number;
  data: {
    data?: any;
    user?: any;
    accessToken?: string;
    refreshToken?: string;
    resetToken?: string;
    otp?: string;
    [key: string]: any;
  };
  message: string;
  success: boolean;
  constructor(
    statusCode: number,
    data: {
      data?: any;
      user?: any;
      accessToken?: string;
      refreshToken?: string;
      resetToken?: string;
      otp?: string;
      [key: string]: any;
    },
    message = "Success"
  ) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { ApiResponse };

// TODO: Consider flattening the structure of `data`
// class ApiResponse {
//   statusCode: number;
//   message: string;
//   success: boolean;

//   // Flattened structure
//   [key: string]: any;

//   constructor(statusCode: number, data: { [key: string]: any } = {}, message = "Success") {
//     this.statusCode = statusCode;
//     this.message = message;
//     this.success = statusCode < 400;

//     // Assign all properties from `data` directly to `this`
//     Object.assign(this, data);
//   }
// }

// export { ApiResponse };
