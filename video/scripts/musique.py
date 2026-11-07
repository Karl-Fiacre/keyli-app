"""Nappe musicale d'ambiance pour les publicités Keyli, générée par calcul
(aucune musique sous droits). Accords la mineur - fa - do - sol, attaque
lente, léger désaccord pour la chaleur, pulsation douce de basse.
Sortie : public/musique.wav (44,1 kHz, stéréo, 16 bits, 48 s)."""
import math, struct, wave, os

TAUX = 44100
DUREE = 48.0
ACCORDS = [  # fréquences (Hz)
    [110.00, 164.81, 220.00, 261.63, 329.63],  # la mineur
    [87.31, 130.81, 174.61, 220.00, 261.63],   # fa
    [130.81, 196.00, 261.63, 329.63, 392.00],  # do
    [98.00, 146.83, 196.00, 246.94, 293.66],   # sol
]
PAR_ACCORD = 4.0
n = int(TAUX * DUREE)
g = [0.0] * n
d = [0.0] * n
for i in range(n):
    t = i / TAUX
    k = int(t // PAR_ACCORD)
    local = t - k * PAR_ACCORD
    # fondu enchaîné entre accords (0,8 s)
    m = min(1.0, local / 0.8)
    courant = ACCORDS[k % 4]
    precedent = ACCORDS[(k - 1) % 4]
    vg = vd = 0.0
    for poids, accord in ((m, courant), (1 - m, precedent)):
        if poids <= 0:
            continue
        for j, f in enumerate(accord):
            a = 0.16 / (1 + j * 0.35)
            vg += poids * a * math.sin(2 * math.pi * f * t)
            vd += poids * a * math.sin(2 * math.pi * f * 1.004 * t + j)
    # basse pulsée (noire à 96 bpm), enveloppe douce
    battement = (t * 96 / 60) % 1.0
    env = math.exp(-battement * 5) * 0.22
    basse = env * math.sin(2 * math.pi * courant[0] / 2 * t)
    # entrée et sortie en fondu
    f_in = min(1.0, t / 2.5)
    f_out = min(1.0, (DUREE - t) / 3.0)
    vol = f_in * f_out * 0.55
    g[i] = (vg + basse) * vol
    d[i] = (vd + basse) * vol
crete = max(max(abs(x) for x in g), max(abs(x) for x in d))
racine = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with wave.open(os.path.join(racine, 'public', 'musique.wav'), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(TAUX)
    trames = bytearray()
    for a, b in zip(g, d):
        trames += struct.pack('<hh', int(a / crete * 0.8 * 32767), int(b / crete * 0.8 * 32767))
    w.writeframes(bytes(trames))
print('musique.wav générée')
