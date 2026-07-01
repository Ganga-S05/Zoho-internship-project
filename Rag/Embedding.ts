const DIM = 256; // size of the embedding vector
// random number java j-108 a=2209 java=223456789
function simpleHash(str: string): number {
  let hash = 0;

  for (const ch of str) {
    hash = hash * 31 + ch.charCodeAt(0);
  }

  return Math.abs(hash);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // remove special characters eg expect (0-9, a-z, A-Z) but not special characters(!@#$%^&*()_+)
    .split(/\s+/)
    .filter((t) => t.length > 1); // remove single character words for example ["java","is a","programming","language"] => ["java","is","programming","language"]
}

export async function embed(text: string): Promise<number[]> {
  // chunk1
  const vec = new Array(DIM).fill(0);
  const tokens = tokenize(text); // text=> array of words["hello", "world"]
  for (const tok of tokens) {
    const i1 = simpleHash(tok) % DIM;
    const i2 = simpleHash(tok + "suffix") % DIM; // i1=3,i2=7 vec[3]+=1,vec[7]+=1=>[1,2,4,1,5,0,0,1,0,1]=> dim=10;
    vec[i1] += 1;
    vec[i2] += 1;
  }

  let sum = 0;

  for (const value of vec) {
    sum += value * value;
  }

  let norm = Math.sqrt(sum); //=0.97

  if (norm === 0) {
    norm = 1;
  }

  return vec.map((value) => value / norm); // new vec=[1/0.97,2/0.97,4/0.97,1/0.97,5/0.97,0/0.97,0/0.97,1/0.97,0/0.97,1/0.97]=>[1.03,2.06,4.12,1.03,5.15,0,0,1.03,0,1.03]
}

export function cosine(a: number[], b: number[]): number {
  // 👉 Cosine similarity between tw
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s; // a=[0.7,0.7],b=[0.7,0.7]=>s=0.7*0.7+0.7*0.7=0.49+0.49=0.98
}
