import { ClusterNetwork, useCluster } from "./cluster-data-access";
import { RadioButton, Text } from "react-native-paper";
import { ClusterPickerRadioButtonGroupRow } from "./cluster-ui";

function clusternetworkToIndex(clusterName: string): number {
  console.log("cluster", clusterName);
  switch (clusterName) {
    case ClusterNetwork.Mainnet:
      return 2;
    case ClusterNetwork.Devnet:
      return 0;
    case ClusterNetwork.Testnet:
      return 1;
    default:
      throw Error("Invalid cluster selected");
  }
}

export default function ClusterPickerFeature() {
  const { selectedCluster, clusters, setSelectedCluster } = useCluster();
  const [devNetCluster, testNetCluster] = clusters;

  return (
    <>
      <Text variant="headlineMedium">Cluster:</Text>
      <RadioButton.Group
        onValueChange={(newClusternetwork) =>
          setSelectedCluster(clusters[clusternetworkToIndex(newClusternetwork)])
        }
        value={selectedCluster.network}
      >
        <ClusterPickerRadioButtonGroupRow cluster={devNetCluster} />
        <ClusterPickerRadioButtonGroupRow cluster={testNetCluster} />
      </RadioButton.Group>
    </>
  );
}
