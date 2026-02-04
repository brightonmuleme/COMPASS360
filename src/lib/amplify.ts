"use client";
import { Amplify } from 'aws-amplify';

const config = {
    Auth: {
        Cognito: {
            userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
            userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
            loginWith: {
                email: true,
            },
        }
    }
};

Amplify.configure(config);

export default function ConfigureAmplifyClientSide() {
    return null;
}
