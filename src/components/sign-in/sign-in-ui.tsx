import { useState, useCallback } from "react";
import { Button } from "react-native-paper";
import { StyleSheet } from "react-native";
import { alertAndLog } from "../../utils/alertAndLog";
import { useAuthorization } from "../../utils/useAuthorization";
import { useMobileWallet } from "../../utils/useMobileWallet";

export function ConnectButton() {
  const { authorizeSession } = useAuthorization();
  const { connect } = useMobileWallet();
  const [authorizationInProgress, setAuthorizationInProgress] = useState(false);
  const handleConnectPress = useCallback(async () => {
    try {
      if (authorizationInProgress) {
        return;
      }
      setAuthorizationInProgress(true);
      await connect();
    } catch (err: any) {
      alertAndLog(
        "Error during connect",
        err instanceof Error ? err.message : err
      );
    } finally {
      setAuthorizationInProgress(false);
    }
  }, [authorizationInProgress, authorizeSession]);
  return (
    <Button
      mode="contained"
      disabled={authorizationInProgress}
      onPress={handleConnectPress}
      style={styles.connectButton}
      contentStyle={styles.buttonContent}
      labelStyle={styles.connectButtonLabel}
    >
      Connect
    </Button>
  );
}

export function SignInButton() {
  const { authorizeSession } = useAuthorization();
  const { signIn } = useMobileWallet();
  const [signInInProgress, setSignInInProgress] = useState(false);
  const handleConnectPress = useCallback(async () => {
    try {
      if (signInInProgress) {
        return;
      }
      setSignInInProgress(true);
      await signIn({
        domain: "yourdomain.com",
        statement: "Sign into Expo Template App",
        uri: "https://yourdomain.com",
      });
    } catch (err: any) {
      alertAndLog(
        "Error during sign in",
        err instanceof Error ? err.message : err
      );
    } finally {
      setSignInInProgress(false);
    }
  }, [signInInProgress, authorizeSession]);
  return (
    <Button
      mode="outlined"
      disabled={signInInProgress}
      onPress={handleConnectPress}
      style={styles.signInButton}
      contentStyle={styles.buttonContent}
      labelStyle={styles.signInButtonLabel}
    >
      Sign in
    </Button>
  );
}

const styles = StyleSheet.create({
  connectButton: {
    flex: 1,
    backgroundColor: '#EBB41C', // Updated to app's gold color
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  signInButton: {
    flex: 1,
    marginLeft: 4,
    borderColor: '#EBB41C', // Updated to app's gold color
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  buttonContent: {
    height: 48,
    paddingHorizontal: 16,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#151515', // Dark color for better contrast on gold
    letterSpacing: 0.5,
  },
  connectButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#151515', // Dark color for filled gold button
    letterSpacing: 0.5,
  },
  signInButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EBB41C', // Gold color for outlined button
    letterSpacing: 0.5,
  }
});
