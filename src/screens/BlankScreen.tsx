import React, { useState } from 'react';
import { View, StyleSheet, Button } from 'react-native';
import { Audio } from 'expo-av';
import { BottomNavigation } from '../components/BottomNavigation';

export default function BlankScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  
  // Bottom navigation state
  const [selectedTab, setSelectedTab] = useState('Blank');
  const [showRecordModal, setShowRecordModal] = useState(false);

  async function startRecording() {
    try {
      if (!permissionResponse || permissionResponse.status !== 'granted') {
        console.log('Requesting permission..');
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false, // Not needed for Android, but harmless
        playsInSilentModeIOS: false, // Not needed for Android, but harmless
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    try {
      if (!recording) return;
      console.log('Stopping recording..');
      await recording.stopAndUnloadAsync();
      setRecording(null);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      const uri = recording.getURI();
      console.log('Recording stopped and stored at', uri);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  }

  // Handle create button press
  const handleCreatePress = () => {
    setShowRecordModal(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Button
          title={recording ? 'Stop Recording' : 'Start Recording'}
          onPress={recording ? stopRecording : startRecording}
        />
      </View>

      {/* Bottom Navigation */}
      <BottomNavigation 
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        onCreatePress={handleCreatePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3896AB', // Match HomeScreen background
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 10,
    paddingBottom: 80, // Space for bottom navigation
  },
});
