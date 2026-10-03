import Viewer from "./Viewer";
import JewelryPiece from "./JewelryPiece";

/** The 3D content of a PreviewCanvas. Kept in its own module so it can be lazy-loaded. */
export default function PreviewScene({ kind, finish, still, label }) {
  return (
    <Viewer shadows={false} camera={[0, 0.2, 4.2]} label={label || "3D preview of a jewellery piece"}>
      <JewelryPiece kind={kind} finish={finish} spin={still ? 0 : 0.35} scale={0.85} />
    </Viewer>
  );
}
