import { PosWorkspace } from "../modules/pos/PosWorkspace";
import s from "./PosPage.module.css";

export default function PosPage() {
  return (
    <div className={s.page}>
      <PosWorkspace />
    </div>
  );
}
