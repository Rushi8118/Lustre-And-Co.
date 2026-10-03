import Viewer from "./Viewer";
import JewelryPiece from "./JewelryPiece";

/** Large product viewer: drag to rotate, scroll or pinch to zoom, and eased thumbnail angles. */
export default function ProductViewer({ kind, finish, turn, label }) {
  return (
    <Viewer interactive zoom camera={[0, 0.3, 4.6]} label={label} className="pdp-viewer">
      <JewelryPiece kind={kind} finish={finish} turn={turn} scale={1} />
    </Viewer>
  );
}
