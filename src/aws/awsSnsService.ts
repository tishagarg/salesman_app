import AWS from "aws-sdk";

export enum EmailType {
  RESET_PASSWORD,
  LOGIN_REQUEST,
  SET_PASSWORD,
  VERIFY_PHONE,
}

// AWS configuration
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

const sns = new AWS.SNS({ apiVersion: "2010–03–31" });
export const sendMessage = async (
  otpOrLink: string,
  phone: string,
  type: EmailType
) => {
  let message: string;

  switch (type) {
    case EmailType.VERIFY_PHONE:
      message = `You have initiated a phone number change request. Please use the following OTP to verify it: ${otpOrLink}`;
      break;

    case EmailType.RESET_PASSWORD:
      message = `You are receiving this because you (or someone else) have requested the reset of the password for your account. Please use the following OTP to reset the password: ${otpOrLink}`;
      break;

    case EmailType.LOGIN_REQUEST:
      message = `You are receiving this because you (or someone else) have requested to log in to your account. Please use the following OTP to log in to your account: ${otpOrLink}`;
      break;

    default:
      throw new Error("Invalid message type");
  }

  const params = {
    Message: message,
    PhoneNumber: phone,
  };

  try {
    const data = await sns.publish(params).promise();
    console.log(`MessageID is ${data.MessageId}`);
  } catch (err) {
    console.error(err);
  }
};
