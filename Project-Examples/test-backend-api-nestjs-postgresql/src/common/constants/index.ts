export const SALT_ROUNDS: number | string = 10; // Số lần tạo muối bảo mật mật khẩu
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;
