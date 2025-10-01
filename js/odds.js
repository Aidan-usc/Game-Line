export async function getOdds(sport) {
  try {
    const res = await fetch(`/api/odds?sport=${sport}`);
    return await res.json();
  } catch (err) {
    console.error("Error fetching odds", err);
    return [];
  }
}
