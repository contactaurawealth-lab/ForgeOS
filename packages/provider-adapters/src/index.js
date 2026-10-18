import { z } from 'zod';

export class ProviderError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ProviderError';
    this.provider = options.provider || 'unknown';
    this.statusCode = options.statusCode;
    this.isRetryable = options.isRetryable || false;
  }
}

export class AuthenticationError extends ProviderError {
  constructor(message, options = {}) {
    super(message, { ...options, isRetryable: false });
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends ProviderError {
  constructor(message, options = {}) {
    super(message, { ...options, isRetryable: true });
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends ProviderError {
  constructor(message, options = {}) {
    super(message, { ...options, isRetryable: true });
    this.name = 'TimeoutError';
  }
}

/**
 * Deterministic Mock AI Provider for offline testing and CI workflows
 */
export class MockProvider {
  constructor(options = {}) {
    this.name = 'mock';
    this.isMock = true;
    this.options = options;
  }

  async generateText({ prompt, systemPrompt, signal }) {
    if (signal?.aborted) {
      throw new TimeoutError('Request aborted', { provider: this.name });
    }
    return {
      text: `Mock response for prompt: "${prompt.slice(0, 50)}..."`,
      usage: { promptTokens: 40, completionTokens: 20, totalTokens: 60 },
      isMock: true,
    };
  }

  async generateStructured({ prompt, systemPrompt, schema, signal }) {
    if (signal?.aborted) {
      throw new TimeoutError('Request aborted', { provider: this.name });
    }

    const lower = prompt.toLowerCase();

    // 1. Requirements analysis scenario
    if (lower.includes('requirements') || lower.includes('analyse') || lower.includes('analyze')) {
      const isStudyDashboard = lower.includes('study') || lower.includes('dashboard') || lower.includes('task');
      const requirements = {
        goal: isStudyDashboard
          ? 'Build a responsive study dashboard with subject cards, progress indicators, a task list, and task creation.'
          : 'Build a responsive web application tailored to user specifications.',
        targetUsers: ['Students', 'Educators', 'Self-directed learners'],
        pages: [
          { path: '/', title: 'Dashboard', description: 'Overview of subjects, tasks, and metrics' },
        ],
        coreFeatures: [
          'Subject progress visualization',
          'Interactive task management and addition form',
          'Light and dark mode theme switching',
          'Responsive layout for mobile and desktop viewports',
        ],
        dataEntities: ['Subject', 'Task', 'StudyMetric'],
        uiComponents: ['Container', 'Grid', 'Card', 'StatCard', 'ProgressBar', 'List', 'Input', 'Button', 'BarChart'],
        constraints: [
          'Must be fully responsive across mobile and desktop breakpoints',
          'Strict adherence to WCAG 2.1 AA accessible contrast ratios',
          'Zero dynamic string eval during UI preview rendering',
        ],
        acceptanceTests: [
          'Dashboard renders subject cards with numeric progress percentages',
          'Form captures and appends new study tasks',
          'Theme toggles between light and dark without layout distortion',
        ],
        openQuestions: [],
      };
      return requirements;
    }

    // 2. Planning scenario
    if (lower.includes('execution plan') || lower.includes('create a plan') || lower.includes('create a dependency-aware') || lower.includes('create execution plan') || lower.includes('planning scenario')) {
      const plan = {
        planId: 'plan_studyos_' + Date.now(),
        title: 'StudyOS Application Engineering Plan',
        tasks: [
          {
            id: 'task_1',
            title: 'Define Application Schema',
            description: 'Construct the typed AppSpecification containing metadata, routes, state, and actions.',
            dependencies: [],
            requiredTools: ['validate_schema'],
            acceptanceCriteria: 'Specification conforms strictly to ForgeOS Schema v1.0.0 without errors.',
            status: 'pending',
          },
          {
            id: 'task_2',
            title: 'Generate Component Tree',
            description: 'Assemble Container, Subject Cards, Task List, and Input form into declarative route hierarchy.',
            dependencies: ['task_1'],
            requiredTools: ['validate_schema'],
            acceptanceCriteria: 'Component tree resolves registered UI kit elements with valid properties.',
            status: 'pending',
          },
          {
            id: 'task_3',
            title: 'Generate TypeScript & React Source Files',
            description: 'Execute deterministic code generator to produce src/App.tsx, components, and package.json.',
            dependencies: ['task_2'],
            requiredTools: ['generate_code'],
            acceptanceCriteria: 'Produces clean, formatted React and TypeScript files without overwriting user edits.',
            status: 'pending',
          },
          {
            id: 'task_4',
            title: 'Run Verification & Smoke Checks',
            description: 'Execute schema validation, type checking, and preview rendering checks.',
            dependencies: ['task_3'],
            requiredTools: ['run_typecheck', 'run_unit_tests'],
            acceptanceCriteria: 'All verification checks exit with code 0.',
            status: 'pending',
          },
        ],
      };
      return plan;
    }

    // 3. Application Specification generation scenario
    if (lower.includes('appspecification') || lower.includes('generate a valid forgeos') || lower.includes('generate complete application specification') || lower.includes('generate a valid')) {
      return {
        schemaVersion: '1.0.0',
        metadata: {
          id: 'studyos-generated',
          name: 'studyos-generated',
          title: 'StudyOS — Responsive Study Dashboard',
          description: 'A responsive study tracking dashboard with subject cards, progress indicators, task list, and task addition form.',
          version: '1.0.0',
          author: 'ForgeOS AI Engine',
          tags: ['study', 'dashboard', 'education'],
          createdAt: '2026-10-18T12:00:00.000Z',
          updatedAt: '2026-10-18T12:00:00.000Z',
        },
        theme: {
          mode: 'light',
          primaryColor: '#2563eb',
          accentColor: '#0d9488',
        },
        routes: [
          {
            id: 'r_dash',
            path: '/',
            title: 'Study Dashboard',
            layout: 'default',
            rootComponent: {
              id: 'c_container',
              type: 'Container',
              props: { maxWidth: '1200px', padding: '24px' },
              children: [
                {
                  id: 'c_heading',
                  type: 'Heading',
                  props: { level: 1, text: 'Study Dashboard', subtitle: 'Manage active subjects and assignments' },
                  children: [],
                },
                {
                  id: 'c_grid_stats',
                  type: 'Grid',
                  props: { columns: 3, gap: '16px' },
                  children: [
                    {
                      id: 'c_stat_1',
                      type: 'StatCard',
                      props: { label: 'Active Subjects', value: '4', change: '+1 this semester', changeType: 'positive' },
                      children: [],
                    },
                    {
                      id: 'c_stat_2',
                      type: 'StatCard',
                      props: { label: 'Weekly Study Hours', value: '28.5 hrs', change: '+3.5 hrs', changeType: 'positive' },
                      children: [],
                    },
                    {
                      id: 'c_stat_3',
                      type: 'StatCard',
                      props: { label: 'Completed Tasks', value: '14 / 20', change: '70% complete', changeType: 'positive' },
                      children: [],
                    },
                  ],
                },
                {
                  id: 'c_heading_subjects',
                  type: 'Heading',
                  props: { level: 2, text: 'Subject Cards & Progress' },
                  children: [],
                },
                {
                  id: 'c_grid_subjects',
                  type: 'Grid',
                  props: { columns: 2, gap: '16px' },
                  children: [
                    {
                      id: 'c_sub_1',
                      type: 'Card',
                      props: { title: 'Distributed Systems', subtitle: 'CS 452' },
                      children: [
                        {
                          id: 'c_prog_1',
                          type: 'ProgressBar',
                          props: { value: 75, label: 'Course Progress' },
                          children: [],
                        },
                        {
                          id: 'c_txt_1',
                          type: 'Text',
                          props: { text: 'Next: Consensus protocols and partition tolerance.', size: 'sm', variant: 'secondary' },
                          children: [],
                        },
                      ],
                    },
                    {
                      id: 'c_sub_2',
                      type: 'Card',
                      props: { title: 'Machine Learning', subtitle: 'CS 480' },
                      children: [
                        {
                          id: 'c_prog_2',
                          type: 'ProgressBar',
                          props: { value: 60, label: 'Course Progress', color: 'var(--forge-accent)' },
                          children: [],
                        },
                        {
                          id: 'c_txt_2',
                          type: 'Text',
                          props: { text: 'Next: Self-attention and transformer blocks.', size: 'sm', variant: 'secondary' },
                          children: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'c_heading_tasks',
                  type: 'Heading',
                  props: { level: 2, text: 'Study Tasks' },
                  children: [],
                },
                {
                  id: 'c_grid_tasks',
                  type: 'Grid',
                  props: { columns: 2, gap: '16px' },
                  children: [
                    {
                      id: 'c_card_tasks',
                      type: 'Card',
                      props: { title: 'Task List' },
                      children: [
                        {
                          id: 'c_task_list',
                          type: 'List',
                          props: {
                            items: [
                              { title: 'Implement Raft heartbeat timer', status: 'In Review' },
                              { title: 'Train transformer sentiment classifier', status: 'Completed' },
                              { title: 'Read Dynamo Paper (Sections 1-4)', status: 'Pending' },
                            ],
                          },
                          children: [],
                        },
                      ],
                    },
                    {
                      id: 'c_card_add_task',
                      type: 'Card',
                      props: { title: 'Add Study Task' },
                      children: [
                        {
                          id: 'c_inp_title',
                          type: 'Input',
                          props: { label: 'Task Title', name: 'taskTitle', placeholder: 'Enter task description', required: true },
                          children: [],
                        },
                        {
                          id: 'c_btn_add',
                          type: 'Button',
                          props: { text: 'Add Task', variant: 'primary', action: 'addTask' },
                          children: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        ],
        state: [
          { key: 'tasks', type: 'array', initialValue: [] },
        ],
        actions: [
          { name: 'addTask', type: 'submit_form', description: 'Add a new study task' },
        ],
      };
    }

    // 4. Bounded repair scenario
    if (lower.includes('repair') || lower.includes('patch') || lower.includes('fix')) {
      return {
        repairAttempted: true,
        patchedFields: ['props', 'children'],
        explanation: 'Corrected property types and removed unknown components.',
        resolved: true,
      };
    }

    // Default fallback structured object
    return {
      message: 'Generated structured data',
      promptSummary: prompt.slice(0, 80),
    };
  }
}

/**
 * Live OpenAI Provider adapter
 */
export class OpenAIProvider {
  constructor(config = {}) {
    this.name = 'openai';
    this.isMock = false;
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.model = config.model || process.env.OPENAI_MODEL || 'gpt-4o';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';

    if (!this.apiKey) {
      throw new AuthenticationError('OPENAI_API_KEY is not configured', { provider: this.name });
    }
  }

  async generateStructured({ prompt, systemPrompt, schema, signal }) {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
        }),
        signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError('OpenAI authentication failed: Invalid API key', { provider: this.name, statusCode: response.status });
      }
      if (response.status === 429) {
        throw new RateLimitError('OpenAI rate limit exceeded', { provider: this.name, statusCode: response.status });
      }
      if (!response.ok) {
        throw new ProviderError(`OpenAI API error: HTTP ${response.status}`, { provider: this.name, statusCode: response.status });
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      return JSON.parse(content);
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      if (err.name === 'AbortError') {
        throw new TimeoutError('OpenAI request timed out or was aborted', { provider: this.name });
      }
      throw new ProviderError(`OpenAI request failed: ${err.message}`, { provider: this.name });
    }
  }
}

/**
 * Factory creating configured AIProvider instance
 * @param {object} [options]
 * @returns {MockProvider | OpenAIProvider}
 */
export function createProvider(options = {}) {
  const providerType = options.provider || process.env.AI_PROVIDER || 'mock';

  switch (providerType.toLowerCase()) {
    case 'openai':
      return new OpenAIProvider(options);
    case 'mock':
    default:
      return new MockProvider(options);
  }
}
