import AWS from 'aws-sdk';
import * as nodemailer from 'nodemailer';

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

const ses = new AWS.SES({ apiVersion: '2010-12-01' });

export async function sendSESEmail(
  email: string,
  subject: string,
  htmlContent: string,
): Promise<void> {
  const params = {
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Html: {
          Data: htmlContent,
        },
      },
      Subject: {
        Data: subject,
      },
    },
    Source: 'admin@voxapp.com',
  };

  try {
    await ses.sendEmail(params).promise();
  } catch (error) {
    console.log(error);
  }
}
export async function sendSESEmailWithAttachment(
  email: string,
  subject: string,
  htmlContent: string,
  attachmentBuffer: any, // Pass the PDF buffer here
  attachmentFilename: string = 'Call_Summary.pdf', // Default filename for the PDF
): Promise<void> {
  const transporter = nodemailer.createTransport({
    SES: { ses, aws: AWS },
  });

  const mailOptions = {
    from: 'admin@voxapp.com',
    to: email,
    subject,
    html: htmlContent,
    attachments: [
      {
        filename: attachmentFilename,
        content: attachmentBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

/**
 * return if the email is verified or not
 *
 * @param email email for which we want to check
 * @returns
 */
export async function isSesIdentityVerified(
  email: string,
): Promise<boolean> {
  try {
    const verificationResponse = await ses
      .getIdentityVerificationAttributes({
        Identities: [email],
      })
      .promise();

    // Check if the email is verified
    const verificationStatus =
      verificationResponse.VerificationAttributes[email]
        ?.VerificationStatus;

    return verificationStatus === 'Success';
  } catch (error) {
    return false;
  }
}
