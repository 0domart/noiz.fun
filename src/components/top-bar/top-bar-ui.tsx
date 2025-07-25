import { Button, IconButton, Menu, useTheme } from "react-native-paper";
import { Account, useAuthorization } from "../../utils/useAuthorization";
import { useMobileWallet } from "../../utils/useMobileWallet";
import { useNavigation } from "@react-navigation/native";
import { ellipsify } from "../../utils/ellipsify";
import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Linking, View, Text } from "react-native";
import { useCluster } from "../cluster/cluster-data-access";

// New TopBar component with app title on the left
export function TopBar() {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 6, // reduced padding
      paddingVertical: 6,
      backgroundColor: '#2d2346',
    }}>
      <Text
        style={{
          color: '#fff',
          fontWeight: 'bold',
          fontSize: 17, // slightly smaller
          flexShrink: 1,
          maxWidth: 110,
        }}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        Degen Sound Box
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexShrink: 0,
          marginLeft: 6,
        }}
      >
        <TopBarWalletMenu />
        <View style={{ marginLeft: 4 }}>
          <TopBarSettingsButton />
        </View>
        {/* Add more buttons here, each wrapped in a View with marginLeft: 4 */}
      </View>
    </View>
  );
}

export function TopBarWalletButton({
  selectedAccount,
  openMenu,
}: {
  selectedAccount: Account | null;
  openMenu: () => void;
}) {
  const { connect } = useMobileWallet();
  return (
    <Button
      icon="wallet"
      mode="contained-tonal"
      style={{ alignSelf: "center" }}
      onPress={selectedAccount ? openMenu : connect}
    >
      {selectedAccount
        ? ellipsify(selectedAccount.publicKey.toBase58())
        : "Connect"}
    </Button>
  );
}

export function TopBarSettingsButton() {
  const navigation = useNavigation();
  return (
    <IconButton
      icon="cog"
      mode="contained-tonal"
      onPress={() => {
        navigation.navigate("Settings");
      }}
    />
  );
}

export function TopBarWalletMenu() {
  const { selectedAccount } = useAuthorization();
  const { getExplorerUrl } = useCluster();
  const [visible, setVisible] = useState(false);
  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);
  const { disconnect } = useMobileWallet();

  const copyAddressToClipboard = async () => {
    if (selectedAccount) {
      await Clipboard.setStringAsync(selectedAccount.publicKey.toBase58());
    }
    closeMenu();
  };

  const viewExplorer = () => {
    if (selectedAccount) {
      const explorerUrl = getExplorerUrl(
        `account/${selectedAccount.publicKey.toBase58()}`
      );
      Linking.openURL(explorerUrl);
    }
    closeMenu();
  };

  return (
    <Menu
      visible={visible}
      onDismiss={closeMenu}
      anchor={
        <TopBarWalletButton
          selectedAccount={selectedAccount}
          openMenu={openMenu}
        />
      }
    >
      <Menu.Item
        onPress={copyAddressToClipboard}
        title="Copy address"
        leadingIcon="content-copy"
      />
      <Menu.Item
        onPress={viewExplorer}
        title="View Explorer"
        leadingIcon="open-in-new"
      />
      <Menu.Item
        onPress={async () => {
          await disconnect();
          closeMenu();
        }}
        title="Disconnect"
        leadingIcon="link-off"
      />
    </Menu>
  );
}
