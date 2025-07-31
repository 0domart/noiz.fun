# 🎧 noiz.fun – Make some Noiz

**noiz.fun** is a playful, mobile-first sound playground built for Solana.

Users can create short audio clips, like others' creations, and earn points in a gamified experience. Think of it as TikTok + Bangers + Tinder, but for short sounds only.

Built for the [Solana Mobile Hackathon](https://solanamobile.com/hackathon), powered by Ferno.

> Built with ❤️ by [@0domart](https://x.com/0domart) and [@ferno_ag](https://x.com/ferno_ag)

> 🎥 **[Pitch Deck](https://www.canva.com/design/DAGtnUAJWxI/mOrMThJc-c7srRi1j2Ky6Q/edit?utm_content=DAGtnUAJWxI&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton)**

> 🎬 **[Product Demo Video](https://vimeo.com/1105789094)**  


### 🏠 Home

- Scroll through trending sounds (ranked by likes)
- Tap to play sounds with visual animation
- Category filters
- Top 1 sound is highlighted with crown + golden frame

---

### 🔥 Discover (Swipe)

- Tinder-style interface
- Swipe right to like, left to skip
- Sounds auto-play
- Each like consumes 1 ⚡️ bolt

---

### ❤️ Favorites

- Shows sounds the user liked
- Only available when wallet is connected

---

### 🎤 Create

- Record directly in-app
- Add title and select a category
- Triggers a **Solana transaction** (0.002 SOL) to create the sound onchain
- Burn 1 ⚡️bolt when publishing

---

### 👤 Profile

- Sign-in with Solana mobile wallet
- Track your uploaded sounds
- See your ⚡️ daily bolts left
- Track your total points (10 pts per like received)

---

## 🚀 How to Run

### 📱 Mobile App

- **Build Android APK**:  
  ```bash
  npx eas build --profile development --platform android
  ```
  ➜ Scan the QR code to install the APK on your phone

- **Run in Expo (development)**:  
  ```bash
  npx expo start -c
  ```
  ➜ Install the **Expo Go** app on your device  
  ➜ Scan the QR code to preview the app  
  ➜ Press `r` in the terminal to refresh manually  

---

### ⛓ Smart Contract (Anchor)

```bash
cd program
anchor build
anchor deploy
```

---

## ⚙️ Tech Stack

- **Expo + React Native** (mobile app)
- **Anchor Smart Contract** (built with Codigo AI)
- **Firebase** (Firestore, Auth, Storage)
- **Solana Mobile Wallet Adapter**
- **Solana Web3 SDK**
