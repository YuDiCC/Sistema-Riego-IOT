#include <Servo.h>

// Pines de control para activar cada LDR (multiplexados en A0)
const int LDR_ARR = 14; // D5
const int LDR_ABJ = 12; // D6
const int LDR_IZQ = 13; // D7
const int LDR_DER = 15; // D8
const int LDR_PIN = A0; // Entrada analógica

// Servos
const int SERVO_H = 0;  // D3
const int SERVO_V = 2;  // D4

Servo servoH;
Servo servoV;
int anguloH = 90;
int anguloV = 90;

void setup() {
  Serial.begin(115200);

  pinMode(LDR_ARR, OUTPUT);
  pinMode(LDR_ABJ, OUTPUT);
  pinMode(LDR_IZQ, OUTPUT);
  pinMode(LDR_DER, OUTPUT);

  // Apagar todos los LDRs al inicio
  digitalWrite(LDR_ARR, LOW);
  digitalWrite(LDR_ABJ, LOW);
  digitalWrite(LDR_IZQ, LOW);
  digitalWrite(LDR_DER, LOW);

  servoH.attach(SERVO_H);
  servoV.attach(SERVO_V);

  servoH.write(anguloH);
  servoV.write(anguloV);
}

void loop() {
  int luzArr = leerLDR(LDR_ARR);
  int luzAbj = leerLDR(LDR_ABJ);
  int luzIzq = leerLDR(LDR_IZQ);
  int luzDer = leerLDR(LDR_DER);

  // Comparación horizontal
  int difH = luzIzq - luzDer;
  if (abs(difH) > 50) {
    anguloH = constrain(anguloH + (difH > 0 ? 1 : -1), 0, 180);
    servoH.write(anguloH);
  }

  // Comparación vertical
  int difV = luzArr - luzAbj;
  if (abs(difV) > 50) {
    anguloV = constrain(anguloV + (difV > 0 ? 1 : -1), 0, 180);
    servoV.write(anguloV);
  }

  Serial.printf("A:%d B:%d I:%d D:%d | H:%d° V:%d°\n",
                luzArr, luzAbj, luzIzq, luzDer,
                anguloH, anguloV);

  delay(500);
}

int leerLDR(int pinControl) {
  digitalWrite(LDR_ARR, LOW);
  digitalWrite(LDR_ABJ, LOW);
  digitalWrite(LDR_IZQ, LOW);
  digitalWrite(LDR_DER, LOW);

  digitalWrite(pinControl, HIGH);
  delay(10);  // estabilizar
  int valor = analogRead(LDR_PIN);
  digitalWrite(pinControl, LOW);
  return valor;
}
