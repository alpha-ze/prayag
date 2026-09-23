/**
 * AI Request Queue — limits concurrent AI calls to avoid rate limiting.
 * Supports multiple API keys for rotation.
 */

interface QueueItem {
  task: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  addedAt: number;
}

class AIRequestQueue {
  private queue: QueueItem[] = [];
  private activeRequests = 0;
  private readonly maxConcurrent = 12;     // 4 keys × ~3 concurrent each
  private readonly maxQueueSize = 150;      // covers all 70 students with buffer
  private readonly timeoutMs = 45000;       // 45s — llama-3.3-70b needs more time
  private processedCount = 0;

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('AI queue is full. Please wait a moment and try again.');
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject, addedAt: Date.now() });
      this.processNext();
    });
  }

  private processNext() {
    if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) return;

    const item = this.queue.shift()!;
    const waitTime = Date.now() - item.addedAt;

    if (waitTime > this.timeoutMs) {
      item.reject(new Error('Request timed out in queue'));
      this.processNext();
      return;
    }

    this.activeRequests++;

    item.task()
      .then(result => {
        this.processedCount++;
        item.resolve(result);
      })
      .catch(err => {
        item.reject(err);
      })
      .finally(() => {
        this.activeRequests--;
        this.processNext();
      });
  }

  getStatus() {
    return {
      active: this.activeRequests,
      queued: this.queue.length,
      processed: this.processedCount,
      capacity: this.maxConcurrent,
    };
  }
}

// Singleton queue shared across all requests
export const aiQueue = new AIRequestQueue();

// ─── Multi-key rotation ───────────────────────────────────────────────────────

function loadGroqKeys(): string[] {
  // Prefer GROQ_API_KEYS (comma-separated list), fall back to single GROQ_API_KEY
  const multiKey = (process.env.GROQ_API_KEYS || '').trim();
  if (multiKey) {
    const keys = multiKey.split(',')
      .map(k => k.trim().replace(/[\r\n\t]/g, ''))  // strip any invisible chars
      .filter(k => k.startsWith('gsk_'));
    if (keys.length > 0) return keys;
  }
  const single = (process.env.GROQ_API_KEY || '').trim().replace(/[\r\n\t]/g, '');
  if (single && single.startsWith('gsk_')) return [single];
  return [];
}

let keyIndex = 0;

export function getNextGroqKey(): string {
  const keys = loadGroqKeys();
  if (keys.length === 0) throw new Error('No GROQ_API_KEY configured');
  const key = keys[keyIndex % keys.length];
  keyIndex++;
  return key;
}

export function getGroqKeyCount(): number {
  return loadGroqKeys().length;
}
