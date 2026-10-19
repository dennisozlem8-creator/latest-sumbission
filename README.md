# Revive Motion

Physical therapy web app for guided recovery, sensor ROM tests, Kids Quest, and video knee-motion tracking.

Live site: [https://www.revivemotion.ai](https://www.revivemotion.ai)  
Source: [https://github.com/dennisozlem8-creator/revive](https://github.com/dennisozlem8-creator/revive)

Kids Quest is a physical therapy stretch world for kids — original 3D quest bots, a calm sky UI, and a three-tap map. Stretch with the bots. Photo Goniometer (live camera or tap three points), MPU-6050, and MyoWare 2.0 all count reps and save the reading on this device. Adult clinic pages stay on the light clinic theme.

## Demo clips

`public/demos/revive-motion-whole-app-demo.mp4` is a 1:20 walkthrough of the live app for Congressional App Challenge 2026: homepage and Recovery Passport, patient briefing and charts, Photo Goniometer (marked 126°), live MPU-6050 angle, live MyoWare, the session stack (Photo, MPU, muscle, heart), Kids Quest Heel Slides to 12/12, session report, Spanish, and the clinician dashboard. Real screens and live numbers, not a toy mock.

`public/demos/revive-motion-patient-demo.mp4` is a 42-second clip of the patient loop: Try the demo → today’s briefing and Recovery Passport 76 → Heel Slide with photo / MPU / muscle tiles → live session (Photo + MPU) → live MPU-6050 angle → charts 92° → session report (photo 92°, motion 78°, muscle 412) → Spanish briefing. Real screens and live numbers, not a toy mock.

`public/demos/kids-quest-demo.mp4` is a 30-second clip of Kids Quest only: Knee → Heel Slides → wireless motion, live angle and reps counting to 12/12, then Sam Bot unlock.

`public/demos/revive-motion-clinician-demo.mp4` is a 34-second clip of the clinician loop: Try clinician demo → caseload (Jordan Rivera, Passport 76, peak 92°, 6 clips) → movement review and saved photo/motion clips → push a care plan. Real screens and saved numbers, not a toy mock.

## Demo account

Tap **Try the demo** on the homepage, or sign in:

- Patient: `demo@revivemotion.ai` / `demo123`
- Clinician: `clinic@revivemotion.ai` / `demo123`
- Caregiver: `care@revivemotion.ai` / `demo123`

The demo patient already has a still photo (92°), a live motion reading (78°), a muscle peak, pain 3/10, and a one-page **Session report** under `/report`. Use **ES / EN** in the header to switch the clinic to Spanish.

The public homepage shows one photo / motion / muscle section that explains each way to measure, plus hip/knee/ankle marks and a progress chart. Signed-in home is the recovery dashboard.

Adult dashboards (home, briefing, care, charts, clinician, session, Photo Goniometer, MyoWare, library, RecoverAI, shop) use the same clinic shell: photo tiles, real rings and heatmaps, Measure · Coach · Report · Improve. Charts use saved clips only — no invented compliance or pain trends.

## Photo Goniometer

Signed-in patients can open **Photo Goniometer** from Dashboard, Charts (Photo tab), or today’s briefing.

1. Choose the exercise, then follow the **Before you record** checklist so the clip is usable.
2. Take a side-view photo or record a short video and tap **Analyze movement**. The coach scores form, compares it to your last clip, and gives the next sets to do.
3. Saved angles, form scores, and next actions stay on this device. Doctors on this device can open a patient and review the movement trend.
4. You can still mark hip → knee → ankle by hand if the camera cannot see the leg.

The estimate is for progress tracking, not a diagnosis. Video files are not stored in the browser database.

## MPU-6050 over HC-05

The motion chip stays on the Elegoo Uno. An HC-05 sends the same angle lines over Bluetooth.

1. MPU VCC stays on Uno 3.3V if that is where it is now. GND → GND. SDA → A4. SCL → A5.
2. HC-05 VCC → Uno 5V. GND → GND. TXD → pin 0 (RX). RXD → pin 1 (TX). Leave EN, STATE, and KEY empty. Do not use pins 2 and 3.
3. Unplug the wires on pins 0 and 1. Board: Arduino Uno. Upload `bluetooth-mpu.ino` from the Motion page. Plug those two wires back in. Close Serial Monitor. Power the Uno from a phone charger.
4. Pair the HC-05 with the computer. PIN `1234`. On the Motion page tap **Connect with Bluetooth** and pick the port named HC-05, not Bluetooth-Incoming-Port.

## MPU-6050 (Elegoo Uno R3)

1. VCC → Uno 3.3V. GND → GND. SCL → A5. SDA → A4. Leave INT empty.
2. HC-05 VCC → Uno 5V. GND → GND. TXD → pin 0. RXD → pin 1.
3. Arduino IDE: Tools → Board → **Arduino Uno**. Download `bluetooth-mpu.ino` from the Motion page (`/motion`). File → Open. Unplug pins 0 and 1, upload, then plug them back. Close Serial Monitor. Power the Uno from a phone charger.
4. Open Chrome or Edge. Go to **MPU-6050** (`/motion`). Tap **Connect with Bluetooth**. Pick HC-05.
5. The page confirms `HELLO MPU6050 ELEGOO_UNO_R3`, then live `ANGLE` lines. Tape the sensor on the limb and tip it.

## MyoWare 2.0 Wireless Shield

Do not use the Elegoo Uno for this. The Wireless Shield is its own ESP32 board.

1. Programming cable into the **Wireless Shield**, only to load the program. POWER SOURCE = VBAT. POWER ON.
2. Arduino IDE: install the **esp32** board package. Tools → Board → **ESP32 Dev Module**.
3. Download `wireless-myoware.ino` from the Muscle page. File → Open. Upload. Close Serial Monitor.
4. POWER OFF. Unplug the programming cable. Snap the shield onto the muscle sensor. Pads: MID / END / REF.
5. POWER ON. Chrome → `/muscle` → **Connect with Bluetooth** → MyoWareSensor1. Flex.

## Heart sensor

A Bluetooth heart-rate strap shows live BPM.

### Bluetooth strap

Polar H9/H10, Wahoo TICKR, Coospo, Magene, and similar Bluetooth heart-rate straps. Apple Watch and many Fitbits do not share heart rate with a website. Motion and muscle sensors connect over Bluetooth too.

## Run locally

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Optional Supabase keys in `.env.local` come from your Supabase project. The app still runs without them; accounts and goniometer results stay in local storage.

Open [http://localhost:3000](http://localhost:3000).
