import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebaseClient";
import type { BeamProcess } from "@/types/beamProcess";

const BEAM_PROCESSES_COLLECTION = "beamProcesses";

export async function upsertBeamProcess(data: BeamProcess): Promise<void> {
  const ref = doc(getFirebaseDb(), BEAM_PROCESSES_COLLECTION, data.id);
  await setDoc(
    ref,
    {
      ...data,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function deleteBeamProcess(id: string): Promise<void> {
  const ref = doc(getFirebaseDb(), BEAM_PROCESSES_COLLECTION, id);
  await deleteDoc(ref);
}
