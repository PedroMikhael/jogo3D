export function checkAABBCollision(boxA, boxB) {
  return (
    boxA.min[0] <= boxB.max[0] && boxA.max[0] >= boxB.min[0] &&
    boxA.min[1] <= boxB.max[1] && boxA.max[1] >= boxB.min[1] &&
    boxA.min[2] <= boxB.max[2] && boxA.max[2] >= boxB.min[2]
  );
}
