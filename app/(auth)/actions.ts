'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { Cookie } from '@/src/entities/models/cookie';
import { SESSION_COOKIE } from '@/config';
import { InputParseError } from '@/src/entities/errors/common';
import {
  AuthenticationError,
  UnauthenticatedError,
} from '@/src/entities/errors/auth';
import { resolveDependency } from '@/di/container';

export async function signUp(formData: FormData) {
  const instrumentationService = resolveDependency('IInstrumentationService');
  return await instrumentationService.instrumentServerAction(
    'signUp',
    { recordResponse: true },
    async () => {
      const username = formData.get('username')?.toString();
      const password = formData.get('password')?.toString();
      const confirmPassword = formData.get('confirm_password')?.toString();

      let sessionCookie: Cookie;
      try {
        const signUpController = resolveDependency('ISignUpController');
        const { cookie } = await signUpController({
          username,
          password,
          confirm_password: confirmPassword,
        });
        sessionCookie = cookie;
      } catch (err) {
        if (err instanceof InputParseError) {
          return {
            error:
              'Invalid data. Make sure the Password and Confirm Password match.',
          };
        }
        const crashReporterService = resolveDependency('ICrashReporterService');
        crashReporterService.report(err);

        return {
          error:
            'An error happened. The developers have been notified. Please try again later. Message: ' +
            (err as Error).message,
        };
      }

      cookies().set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );

      redirect('/');
    }
  );
}

export async function signIn(formData: FormData) {
  const instrumentationService = resolveDependency('IInstrumentationService');
  return await instrumentationService.instrumentServerAction(
    'signIn',
    { recordResponse: true },
    async () => {
      const username = formData.get('username')?.toString();
      const password = formData.get('password')?.toString();

      let sessionCookie: Cookie;
      try {
        const signInController = resolveDependency('ISignInController');
        sessionCookie = await signInController({ username, password });
      } catch (err) {
        if (
          err instanceof InputParseError ||
          err instanceof AuthenticationError
        ) {
          return {
            error: 'Incorrect username or password',
          };
        }
        const crashReporterService = resolveDependency('ICrashReporterService');
        crashReporterService.report(err);
        return {
          error:
            'An error happened. The developers have been notified. Please try again later.',
        };
      }

      cookies().set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );

      redirect('/');
    }
  );
}

export async function signOut() {
  const instrumentationService = resolveDependency('IInstrumentationService');
  return await instrumentationService.instrumentServerAction(
    'signOut',
    { recordResponse: true },
    async () => {
      const cookiesStore = cookies();
      const sessionId = cookiesStore.get(SESSION_COOKIE)?.value;

      let blankCookie: Cookie;
      try {
        const signOutController = resolveDependency('ISignOutController');
        blankCookie = await signOutController(sessionId);
      } catch (err) {
        if (
          err instanceof UnauthenticatedError ||
          err instanceof InputParseError
        ) {
          redirect('/sign-in');
        }
        const crashReporterService = resolveDependency('ICrashReporterService');
        crashReporterService.report(err);
        throw err;
      }

      cookies().set(
        blankCookie.name,
        blankCookie.value,
        blankCookie.attributes
      );

      redirect('/sign-in');
    }
  );
}
