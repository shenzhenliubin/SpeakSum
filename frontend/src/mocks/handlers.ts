import { http, HttpResponse } from 'msw';
import { faker } from '@faker-js/faker';
import type {
  Content,
  Domain,
  GraphDomainDetail,
  GraphEdge,
  GraphLayout,
  GraphNode,
  ModelConfig,
  ProcessingTask,
  Quote,
  SpeakerIdentity,
} from '@/types';

const defaultDomains: Domain[] = [
  {
    id: 'decision_method',
    display_name: '方法论与决策',
    description: '与判断框架、决策方式相关的思想输出。',
    is_system_default: true,
    sort_order: 1,
    created_at: faker.date.past().toISOString(),
  },
  {
    id: 'technology_architecture',
    display_name: '技术与架构',
    description: '与技术路线、架构设计、工程治理相关的思想输出。',
    is_system_default: true,
    sort_order: 2,
    created_at: faker.date.past().toISOString(),
  },
];

const buildQuote = (contentId: string, domainIds: string[]): Quote => ({
  id: `quote_${faker.string.alphanumeric(8)}`,
  content_id: contentId,
  sequence_number: faker.number.int({ min: 1, max: 5 }),
  text: faker.helpers.arrayElement([
    '先明确约束条件，再决定资源投入节奏。',
    '平台化不是多做组件，而是先定义边界。',
    '组织扩张前要先解决协作链路的阻塞点。',
  ]),
  domain_ids: domainIds,
  created_at: faker.date.recent({ days: 30 }).toISOString(),
  updated_at: faker.date.recent({ days: 5 }).toISOString(),
});

const buildContent = (status: Content['status'] = 'completed'): Content => {
  const sourceType = faker.helpers.arrayElement<Content['source_type']>(['meeting_minutes', 'other_text']);
  const contentId = `content_${faker.string.alphanumeric(8)}`;
  const quotes = [buildQuote(contentId, [faker.helpers.arrayElement(defaultDomains).id])];
  return {
    id: contentId,
    user_id: `user_${faker.string.alphanumeric(8)}`,
    title: sourceType === 'meeting_minutes' ? `${faker.company.name()}会议纪要` : `${faker.company.buzzPhrase()}随笔`,
    source_type: sourceType,
    content_date: faker.date.recent({ days: 30 }).toISOString().split('T')[0],
    source_file_name: `${faker.system.fileName()}.txt`,
    source_file_path: null,
    source_file_size: faker.number.int({ min: 1024, max: 1024 * 512 }),
    file_type: 'txt',
    status,
    ignored_reason: status === 'ignored' ? '未检测到刘彬发言，因此未生成记录' : null,
    error_message: status === 'failed' ? '处理失败' : null,
    summary_text: '这是一段结构化的发言总结，概括了本次内容的核心判断和重点关注方向。',
    quotes,
    created_at: faker.date.recent({ days: 30 }).toISOString(),
    updated_at: faker.date.recent({ days: 5 }).toISOString(),
    completed_at: status === 'completed' ? faker.date.recent({ days: 2 }).toISOString() : null,
  };
};

const buildGraphNode = (domain: Domain, index: number): GraphNode => ({
  id: domain.id,
  type: 'domain',
  label: domain.display_name,
  x: 160 + index * 120,
  y: 200 + (index % 2) * 80,
  size: 28 + index * 4,
});

const taskProgressMap = new Map<string, number>();
const taskContentMap = new Map<string, string>();

export const handlers = [
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string };
    return HttpResponse.json({
      user: {
        id: `user_${faker.string.alphanumeric(8)}`,
        email: body.email,
        name: '测试用户',
        createdAt: faker.date.recent().toISOString(),
      },
      token: `mock-token-${faker.string.alphanumeric(16)}`,
    });
  }),

  http.post('/api/v1/auth/register', async ({ request }) => {
    const body = await request.json() as { email: string; name: string };
    return HttpResponse.json({
      user: {
        id: `user_${faker.string.alphanumeric(8)}`,
        email: body.email,
        name: body.name,
        createdAt: faker.date.recent().toISOString(),
      },
      token: `mock-token-${faker.string.alphanumeric(16)}`,
    });
  }),

  http.get('/api/v1/auth/me', () => {
    return HttpResponse.json({
      id: `user_${faker.string.alphanumeric(8)}`,
      email: 'test@example.com',
      name: '测试用户',
      createdAt: faker.date.recent().toISOString(),
    });
  }),

  http.post('/api/v1/auth/refresh', () => {
    return HttpResponse.json({
      token: `mock-refreshed-token-${faker.string.alphanumeric(16)}`,
    });
  }),

  http.post('/api/v1/upload', async () => {
    const taskId = `task_${faker.string.alphanumeric(8)}`;
    const contentId = `content_${faker.string.alphanumeric(8)}`;
    taskProgressMap.set(taskId, 0);
    taskContentMap.set(taskId, contentId);
    return HttpResponse.json(
      {
        task_id: taskId,
        content_id: contentId,
        status: 'pending',
      },
      { status: 202 }
    );
  }),

  http.get('/api/v1/upload/:task_id/status', ({ params }) => {
    const taskId = params.task_id as string;
    const contentId = taskContentMap.get(taskId) || `content_${faker.string.alphanumeric(8)}`;
    const progress = Math.min((taskProgressMap.get(taskId) || 0) + 25, 100);
    taskProgressMap.set(taskId, progress);
    const completed = progress >= 100;

    return HttpResponse.json({
      task_id: taskId,
      content_id: contentId,
      status: completed ? 'completed' : 'processing',
      progress,
      current_step: completed ? 'completed' : 'summarizing',
      message: completed ? '处理完成' : '正在生成发言总结',
      error_message: null,
      created_at: faker.date.recent().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ProcessingTask);
  }),

  http.get('/api/v1/process/:task_id/stream', ({ params }) => {
    const taskId = params.task_id as string;
    const contentId = taskContentMap.get(taskId) || `content_${faker.string.alphanumeric(8)}`;

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        let progress = 0;

        const interval = setInterval(() => {
          progress += 25;
          const completed = progress >= 100;
          const data: ProcessingTask = {
            task_id: taskId,
            content_id: contentId,
            status: completed ? 'completed' : 'processing',
            progress,
            current_step: completed ? 'completed' : 'extracting_quotes',
            message: completed ? '处理完成' : '正在提炼思想金句',
            error_message: null,
            created_at: faker.date.recent().toISOString(),
            updated_at: new Date().toISOString(),
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

          if (completed) {
            clearInterval(interval);
            controller.close();
          }
        }, 100);
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }),

  http.get('/api/v1/contents', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('page_size') || '20');
    const q = url.searchParams.get('q');
    const status = url.searchParams.get('status') as Content['status'] | null;

    const allContents = Array.from({ length: 24 }, () => buildContent(status || faker.helpers.arrayElement(['processing', 'completed'])));
    const filtered = q ? allContents.filter((content) => content.title.includes(q)) : allContents;
    const items = filtered.slice((page - 1) * pageSize, page * pageSize);

    return HttpResponse.json({
      items,
      total: filtered.length,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(filtered.length / pageSize),
    });
  }),

  http.get('/api/v1/contents/:content_id', ({ params }) => {
    const contentId = params.content_id as string;
    const content = buildContent();
    const quotes = [buildQuote(contentId, ['decision_method']), buildQuote(contentId, ['technology_architecture'])];
    return HttpResponse.json({
      ...content,
      id: contentId,
      quotes,
    } satisfies Content);
  }),

  http.delete('/api/v1/contents/:content_id', () => new HttpResponse(null, { status: 204 })),

  http.patch('/api/v1/contents/:content_id/summary', async ({ params, request }) => {
    const contentId = params.content_id as string;
    const body = await request.json() as { summary_text: string };
    const content = buildContent();
    return HttpResponse.json({
      ...content,
      id: contentId,
      summary_text: body.summary_text,
    } satisfies Content);
  }),

  http.patch('/api/v1/contents/:content_id/quotes/:quote_id', async ({ params, request }) => {
    const quoteId = params.quote_id as string;
    const body = await request.json() as Partial<Quote>;
    return HttpResponse.json({
      ...buildQuote(params.content_id as string, body.domain_ids || ['decision_method']),
      id: quoteId,
      text: body.text || '更新后的思想金句',
      domain_ids: body.domain_ids || ['decision_method'],
    } satisfies Quote);
  }),

  http.delete('/api/v1/contents/:content_id/quotes/:quote_id', () => new HttpResponse(null, { status: 204 })),

  http.get('/api/v1/knowledge-graph', () => {
    const nodes = defaultDomains.map(buildGraphNode);
    const edges: GraphEdge[] = [
      {
        source: defaultDomains[0]!.id,
        target: defaultDomains[1]!.id,
        strength: 0.72,
        type: 'related',
      },
    ];

    return HttpResponse.json({
      nodes,
      edges,
      layout_version: '2',
    } satisfies GraphLayout);
  }),

  http.get('/api/v1/knowledge-graph/domains/:domain_id', ({ params }) => {
    const domainId = params.domain_id as string;
    const domain = defaultDomains.find((item) => item.id === domainId) || defaultDomains[0]!;
    const detail: GraphDomainDetail = {
      domain,
      quotes: [
        {
          id: `quote_${faker.string.alphanumeric(6)}`,
          content_id: `content_${faker.string.alphanumeric(6)}`,
          text: '先明确边界，再决定资源投入节奏。',
          domain_ids: [domain.id],
        },
      ],
      total: 1,
    };
    return HttpResponse.json(detail);
  }),

  http.get('/api/v1/settings/model', () => {
    const configs: ModelConfig[] = [
      {
        id: 'cfg_openai',
        provider: 'openai',
        name: 'OpenAI GPT-4',
        has_api_key: true,
        base_url: null,
        default_model: 'gpt-4',
        is_default: true,
        is_enabled: true,
        created_at: faker.date.past().toISOString(),
      },
      {
        id: 'cfg_siliconflow',
        provider: 'siliconflow',
        name: '硅基流动',
        has_api_key: true,
        base_url: null,
        default_model: 'deepseek-ai/DeepSeek-V3',
        is_default: false,
        is_enabled: true,
        created_at: faker.date.past().toISOString(),
      },
    ];
    return HttpResponse.json(configs);
  }),

  http.put('/api/v1/settings/model', async ({ request }) => {
    const body = await request.json() as ModelConfig[];
    return HttpResponse.json(body);
  }),

  http.post('/api/v1/settings/model/test', async ({ request }) => {
    const body = await request.json() as { provider: string; default_model: string };
    return HttpResponse.json({
      success: true,
      message: '连接成功',
      provider: body.provider,
      model: body.default_model,
    });
  }),

  http.get('/api/v1/speaker-identities', () => {
    const identities: SpeakerIdentity[] = [
      {
        id: 'identity-liubin',
        user_id: 'user-test',
        display_name: '刘彬',
        aliases: ['老刘'],
        color: null,
        avatar_url: null,
        is_default: true,
        created_at: faker.date.past().toISOString(),
        updated_at: faker.date.recent().toISOString(),
      },
    ];
    return HttpResponse.json({ success: true, data: identities, meta: null, error: null });
  }),

  http.post('/api/v1/speaker-identities', async ({ request }) => {
    const body = await request.json() as Omit<SpeakerIdentity, 'id' | 'created_at' | 'updated_at'>;
    return HttpResponse.json({
      success: true,
      data: {
        ...body,
        id: `identity_${faker.string.alphanumeric(6)}`,
        created_at: faker.date.recent().toISOString(),
        updated_at: faker.date.recent().toISOString(),
      },
      meta: null,
      error: null,
    });
  }),

  http.put('/api/v1/speaker-identities/:identity_id', async ({ params, request }) => {
    const body = await request.json() as Omit<SpeakerIdentity, 'id' | 'created_at' | 'updated_at'>;
    return HttpResponse.json({
      success: true,
      data: {
        ...body,
        id: params.identity_id as string,
        created_at: faker.date.past().toISOString(),
        updated_at: faker.date.recent().toISOString(),
      },
      meta: null,
      error: null,
    });
  }),

  http.delete('/api/v1/speaker-identities/:identity_id', () => new HttpResponse(null, { status: 204 })),
];
