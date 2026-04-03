import { http, HttpResponse } from 'msw';
import { faker } from '@faker-js/faker';
import type {
  Meeting,
  Speech,
  GraphLayout,
  ProcessingTask,
  Topic,
  GraphEdge,
  ModelConfig,
} from '@/types';

// Helper to generate fake meeting
const generateMeeting = (status: 'processing' | 'completed' | 'error' = 'completed'): Meeting => ({
  id: `mtg_${faker.string.alphanumeric(8)}`,
  title: `${faker.commerce.productName()}会议`,
  meeting_date: faker.date.recent({ days: 30 }).toISOString().split('T')[0],
  participants: faker.helpers.uniqueArray(() => faker.person.fullName(), faker.number.int({ min: 2, max: 5 })),
  speech_count: faker.number.int({ min: 5, max: 50 }),
  topic_count: faker.number.int({ min: 2, max: 10 }),
  status,
  source_file: `meeting_${faker.date.recent().toISOString().split('T')[0]}.txt`,
  file_size: faker.number.int({ min: 1024, max: 1024 * 1024 }),
  created_at: faker.date.recent({ days: 30 }).toISOString(),
});

// Helper to generate fake speech
const generateSpeech = (meetingId: string): Speech => ({
  id: `spc_${faker.string.alphanumeric(8)}`,
  meeting_id: meetingId,
  timestamp: `${faker.number.int({ min: 9, max: 18 })}:${faker.number.int({ min: 0, max: 59 }).toString().padStart(2, '0')}:${faker.number.int({ min: 0, max: 59 }).toString().padStart(2, '0')}`,
  speaker: faker.person.fullName(),
  raw_text: faker.lorem.paragraph(),
  cleaned_text: faker.lorem.paragraph(),
  key_quotes: faker.helpers.arrayElements([
    '方案设计需要全面评估可行性和风险',
    '团队协作是项目成功的关键',
    '数据驱动决策能提高成功率',
  ], { min: 0, max: 2 }),
  topics: faker.helpers.uniqueArray(() => faker.commerce.productName(), faker.number.int({ min: 1, max: 3 })),
  sentiment: faker.helpers.arrayElement(['positive', 'negative', 'neutral', 'mixed']),
  word_count: faker.number.int({ min: 20, max: 200 }),
  created_at: faker.date.recent({ days: 30 }).toISOString(),
});

// Helper to generate fake topic node
const generateTopic = (): Topic => {
  const count = faker.number.int({ min: 3, max: 20 });
  const firstDate = faker.date.past({ years: 1 });
  const lastDate = faker.date.recent({ days: 30 });
  return {
    id: `topic_${faker.string.alphanumeric(6)}`,
    name: faker.commerce.productName(),
    count,
    meeting_count: faker.number.int({ min: 1, max: 5 }),
    first_appearance: firstDate.toISOString().split('T')[0],
    last_appearance: lastDate.toISOString().split('T')[0],
    x: faker.number.float({ min: 50, max: 750 }),
    y: faker.number.float({ min: 50, max: 550 }),
  };
};

// Mock storage for tracking task progress
const taskProgressMap = new Map<string, number>();

export const handlers = [
  // ========== Upload ==========
  // POST /api/v1/upload
  http.post('/api/v1/upload', async () => {
    const taskId = `task_${faker.string.alphanumeric(8)}`;
    const meetingId = `mtg_${faker.string.alphanumeric(8)}`;

    // Initialize task progress
    taskProgressMap.set(taskId, 0);

    return HttpResponse.json({
      task_id: taskId,
      meeting_id: meetingId,
      status: 'pending',
    }, { status: 202 });
  }),

  // GET /api/v1/upload/:task_id/status
  http.get('/api/v1/upload/:task_id/status', ({ params }) => {
    const taskId = params.task_id as string;
    let progress = taskProgressMap.get(taskId) || 0;

    // Simulate progress increment
    progress += 20;
    taskProgressMap.set(taskId, progress);

    let status: ProcessingTask['status'] = 'processing';
    let currentStep = 'extracting';

    if (progress >= 100) {
      status = 'completed';
      currentStep = 'completed';
    }

    return HttpResponse.json({
      task_id: taskId,
      meeting_id: `mtg_${faker.string.alphanumeric(8)}`,
      status,
      progress,
      current_step: currentStep,
      error_message: null,
      created_at: faker.date.recent().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),

  // GET /api/v1/upload/:task_id/stream (SSE)
  http.get('/api/v1/upload/:task_id/stream', ({ params }) => {
    const taskId = params.task_id as string;

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        let progress = 0;

        const interval = setInterval(() => {
          progress += 20;

          const data: ProcessingTask = {
            task_id: taskId,
            meeting_id: `mtg_${faker.string.alphanumeric(8)}`,
            status: progress >= 100 ? 'completed' : 'processing',
            progress,
            current_step: progress >= 100 ? 'completed' : 'extracting',
            error_message: null,
            created_at: faker.date.recent().toISOString(),
            updated_at: new Date().toISOString(),
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

          if (progress >= 100) {
            clearInterval(interval);
            controller.close();
          }
        }, 1000);
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }),

  // ========== Meetings ==========
  // GET /api/v1/meetings
  http.get('/api/v1/meetings', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('page_size') || '20');
    const q = url.searchParams.get('q');
    const status = url.searchParams.get('status') as 'processing' | 'completed' | 'error' | null;

    // Generate mock meetings
    const total = 45;
    const allMeetings = Array.from({ length: total }, () =>
      generateMeeting(status || faker.helpers.arrayElement(['processing', 'completed', 'error']))
    );

    // Filter by search query
    let filtered = allMeetings;
    if (q) {
      filtered = allMeetings.filter((m) =>
        m.title.toLowerCase().includes(q.toLowerCase())
      );
    }

    // Pagination
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const items = filtered.slice(start, end);

    return HttpResponse.json({
      items,
      total: filtered.length,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(filtered.length / pageSize),
    });
  }),

  // GET /api/v1/meetings/:meeting_id
  http.get('/api/v1/meetings/:meeting_id', ({ params }) => {
    const meetingId = params.meeting_id as string;

    const meeting = generateMeeting();
    return HttpResponse.json({
      ...meeting,
      id: meetingId,
      source_file: 'meeting_2024_04_01.txt',
      file_size: 1024 * 1024,
    } as Meeting);
  }),

  // DELETE /api/v1/meetings/:meeting_id
  http.delete('/api/v1/meetings/:meeting_id', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // ========== Speeches ==========
  // GET /api/v1/meetings/:meeting_id/speeches
  http.get('/api/v1/meetings/:meeting_id/speeches', ({ params, request }) => {
    const meetingId = params.meeting_id as string;
    const url = new URL(request.url);
    const _page = parseInt(url.searchParams.get('page') || '1');
    const _pageSize = parseInt(url.searchParams.get('page_size') || '50');

    // Suppress unused variable warnings while keeping API compatibility
    void _page;
    void _pageSize;

    const total = 15;
    const items = Array.from({ length: total }, () => generateSpeech(meetingId));

    return HttpResponse.json({
      items,
      total,
    });
  }),

  // GET /api/v1/speeches/:speech_id
  http.get('/api/v1/speeches/:speech_id', ({ params }) => {
    const speechId = params.speech_id as string;

    return HttpResponse.json({
      ...generateSpeech('mtg_test'),
      id: speechId,
    });
  }),

  // PATCH /api/v1/speeches/:speech_id
  http.patch('/api/v1/speeches/:speech_id', async ({ params, request }) => {
    const speechId = params.speech_id as string;
    const updates = await request.json() as Partial<Speech>;
    const baseSpeech = generateSpeech('mtg_test');

    return HttpResponse.json({
      ...baseSpeech,
      id: speechId,
      ...updates,
    } as Speech);
  }),

  // ========== Knowledge Graph ==========
  // GET /api/v1/knowledge-graph
  http.get('/api/v1/knowledge-graph', () => {
    const nodes: Topic[] = Array.from({ length: 8 }, generateTopic);

    const edges: GraphEdge[] = nodes.slice(0, -1).map((node, i) => ({
      source: node.id,
      target: nodes[i + 1]?.id || nodes[0].id,
      strength: faker.number.float({ min: 0.3, max: 1 }),
      co_occurrence: faker.number.int({ min: 1, max: 10 }),
    }));

    return HttpResponse.json({
      nodes,
      edges,
      layout_version: '1',
    } as GraphLayout);
  }),

  // GET /api/v1/knowledge-graph/topics/:topic_id/speeches
  http.get('/api/v1/knowledge-graph/topics/:topic_id/speeches', ({ params }) => {
    const topicId = params.topic_id as string;

    return HttpResponse.json({
      topic: {
        ...generateTopic(),
        id: topicId,
      },
      speeches: Array.from({ length: 5 }, () => generateSpeech('mtg_test')),
      total: 5,
    });
  }),

  // ========== Settings ==========
  // GET /api/v1/settings/model
  http.get('/api/v1/settings/model', () => {
    const configs: ModelConfig[] = [
      {
        id: 'cfg_openai',
        provider: 'openai',
        name: 'OpenAI GPT-4',
        base_url: 'https://api.openai.com/v1',
        default_model: 'gpt-4',
        is_default: true,
        is_enabled: true,
        created_at: faker.date.past().toISOString(),
      },
      {
        id: 'cfg_kimi',
        provider: 'kimi',
        name: 'Kimi Moonshot',
        base_url: null,
        default_model: 'moonshot-v1',
        is_default: false,
        is_enabled: true,
        created_at: faker.date.past().toISOString(),
      },
    ];

    return HttpResponse.json({
      configs,
      default_config_id: 'cfg_openai',
    });
  }),

  // PUT /api/v1/settings/model
  http.put('/api/v1/settings/model', async ({ request }) => {
    const body = await request.json() as { action: string; config?: Partial<ModelConfig> };

    if (body.action === 'create' && body.config) {
      return HttpResponse.json({
        success: true,
        config: {
          ...body.config,
          id: `cfg_${faker.string.alphanumeric(6)}`,
          created_at: new Date().toISOString(),
        },
      });
    }

    return HttpResponse.json({ success: true });
  }),
];
