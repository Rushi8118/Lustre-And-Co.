import Viewer from "./Viewer";
import JewelryPiece from "./JewelryPiece";

/** The large ring shown in "Choose your light". Lazy-loaded with its own chunk. */
export default function FinishViewer({ finish, still }) {
  return (
    <Viewer interactive autoRotate={!still} camera={[0, 0.3, 4.8]} label="Ring in the selected finish. Drag to rotate.">
      <JewelryPiece kind="ring" finish={finish} spin={still ? 0 : 0.3} scale={1.05} />
    </Viewer>
  );
}
