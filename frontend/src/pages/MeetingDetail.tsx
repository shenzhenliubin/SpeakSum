import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Empty, Input, Select, Space, Tag, message } from 'antd';
import {
  ArrowLeftOutlined,
  BulbOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  SaveOutlined,
} from '@ant-design/icons';

import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import {
  useContent,
  useDeleteContentQuote,
  useUpdateContentQuote,
  useUpdateContentSummary,
} from '@/hooks/useContents';
import type { Quote } from '@/types';
import { DOMAIN_LABELS } from '@/utils/constants';
import { formatDate, formatNumber, formatSourceType, formatStatus } from '@/utils/formatters';

const DOMAIN_OPTIONS = Object.entries(DOMAIN_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const getDomainLabel = (domainId: string) => DOMAIN_LABELS[domainId] ?? domainId;

export const MeetingDetail = () => {
  const { contentId: routeContentId, meetingId: legacyMeetingId } = useParams<{
    contentId?: string;
    meetingId?: string;
  }>();
  const contentId = routeContentId ?? legacyMeetingId;
  const navigate = useNavigate();

  const { data: content, isLoading } = useContent(contentId);
  const updateSummaryMutation = useUpdateContentSummary();
  const updateQuoteMutation = useUpdateContentQuote();
  const deleteQuoteMutation = useDeleteContentQuote();

  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [quoteDraftText, setQuoteDraftText] = useState('');
  const [quoteDraftDomains, setQuoteDraftDomains] = useState<string[]>([]);

  const sortedQuotes = useMemo(
    () => [...(content?.quotes ?? [])].sort((a, b) => a.sequence_number - b.sequence_number),
    [content?.quotes],
  );

  useEffect(() => {
    if (!content) {
      setIsEditingSummary(false);
      setSummaryDraft('');
      setEditingQuoteId(null);
      setQuoteDraftText('');
      setQuoteDraftDomains([]);
      return;
    }

    if (editingQuoteId && !content.quotes.some((quote) => quote.id === editingQuoteId)) {
      setEditingQuoteId(null);
      setQuoteDraftText('');
      setQuoteDraftDomains([]);
    }
  }, [content, editingQuoteId]);

  const startEditingSummary = () => {
    setSummaryDraft(content?.summary_text ?? '');
    setIsEditingSummary(true);
  };

  const cancelSummaryEditing = () => {
    setSummaryDraft('');
    setIsEditingSummary(false);
  };

  const saveSummary = async () => {
    const trimmed = summaryDraft.trim();
    if (!contentId || !trimmed) return;

    await updateSummaryMutation.mutateAsync({
      contentId,
      summaryText: trimmed,
    });
    cancelSummaryEditing();
  };

  const startEditingQuote = (quote: Quote) => {
    setEditingQuoteId(quote.id);
    setQuoteDraftText(quote.text);
    setQuoteDraftDomains(quote.domain_ids);
  };

  const cancelQuoteEditing = () => {
    setEditingQuoteId(null);
    setQuoteDraftText('');
    setQuoteDraftDomains([]);
  };

  const handleQuoteDomainsChange = (value: string[]) => {
    setQuoteDraftDomains(value);
    if (!value.length) {
      message.error('至少保留一个归属领域');
    }
  };

  const saveQuote = async (quote: Quote) => {
    const trimmed = quoteDraftText.trim();
    if (!contentId || !trimmed) return;
    if (!quoteDraftDomains.length) {
      message.error('至少保留一个归属领域');
      return;
    }

    await updateQuoteMutation.mutateAsync({
      contentId,
      quoteId: quote.id,
      data: {
        text: trimmed,
        domain_ids: quoteDraftDomains,
      },
    });
    cancelQuoteEditing();
  };

  const removeQuote = async (quoteId: string) => {
    if (!contentId) return;

    await deleteQuoteMutation.mutateAsync({ contentId, quoteId });
    if (editingQuoteId === quoteId) {
      cancelQuoteEditing();
    }
  };

  if (isLoading) {
    return <LoadingState type="skeleton" rows={5} />;
  }

  if (!content) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          type="error"
          title="内容未找到"
          description="这条内容不存在或已被删除"
          action={{
            label: '返回思想记录',
            onClick: () => navigate('/timeline'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/timeline')}>
          返回
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-display text-text-primary">{content.title}</h1>
          <p className="text-text-secondary">
            {formatDate(content.content_date)} · {formatSourceType(content.source_type)} ·{' '}
            {formatNumber(sortedQuotes.length)} 条思想金句
          </p>
        </div>
        <Tag color={content.status === 'completed' ? 'success' : content.status === 'ignored' ? 'warning' : 'processing'}>
          {formatStatus(content.status)}
        </Tag>
      </div>

      <Card
        title={(
          <span>
            <FileTextOutlined className="mr-2" />
            发言总结
          </span>
        )}
        className="mb-6"
        extra={isEditingSummary ? (
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              aria-label="保存发言总结"
              loading={updateSummaryMutation.isPending}
              onClick={() => void saveSummary()}
            >
              保存
            </Button>
            <Button onClick={cancelSummaryEditing}>取消</Button>
          </Space>
        ) : (
          <Button
            icon={<EditOutlined />}
            aria-label="编辑发言总结"
            onClick={startEditingSummary}
          >
            编辑
          </Button>
        )}
      >
        {isEditingSummary ? (
          <Input.TextArea
            value={summaryDraft}
            placeholder="输入发言总结"
            autoSize={{ minRows: 5, maxRows: 8 }}
            onChange={(event) => setSummaryDraft(event.target.value)}
          />
        ) : (
          <p className="text-text-primary leading-relaxed whitespace-pre-line">
            {content.summary_text || '暂无发言总结'}
          </p>
        )}
      </Card>

      <Card
        title={(
          <span>
            <BulbOutlined className="mr-2" />
            思想金句
          </span>
        )}
        className="mb-6"
      >
        {sortedQuotes.length > 0 ? (
          <div className="space-y-4">
            {sortedQuotes.map((quote) => {
              const isEditing = editingQuoteId === quote.id;
              return (
                <Card key={quote.id} size="small" className="border-l-4 border-l-terracotta">
                  <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag color="processing">金句 {quote.sequence_number}</Tag>
                      {!isEditing && quote.domain_ids.map((domainId) => (
                        <Tag key={domainId} color="default" className="rounded-full">
                          #{getDomainLabel(domainId)}
                        </Tag>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="small"
                            icon={<SaveOutlined />}
                            type="primary"
                            aria-label={`保存金句 ${quote.sequence_number}`}
                            disabled={!quoteDraftDomains.length}
                            loading={updateQuoteMutation.isPending}
                            onClick={() => void saveQuote(quote)}
                          >
                            保存
                          </Button>
                          <Button size="small" onClick={cancelQuoteEditing}>
                            取消
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            aria-label={`编辑金句 ${quote.sequence_number}`}
                            onClick={() => startEditingQuote(quote)}
                          >
                            编辑
                          </Button>
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            aria-label={`删除金句 ${quote.sequence_number}`}
                            loading={deleteQuoteMutation.isPending}
                            onClick={() => void removeQuote(quote.id)}
                          >
                            删除
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <Input.TextArea
                        value={quoteDraftText}
                        placeholder="输入思想金句"
                        autoSize={{ minRows: 3, maxRows: 6 }}
                        onChange={(event) => setQuoteDraftText(event.target.value)}
                      />
                      <Select
                        mode="multiple"
                        aria-label={`金句领域 ${quote.sequence_number}`}
                        placeholder="选择关联领域"
                        options={DOMAIN_OPTIONS}
                        value={quoteDraftDomains}
                        onChange={handleQuoteDomainsChange}
                        optionFilterProp="label"
                      />
                    </div>
                  ) : (
                    <p className="text-text-primary leading-relaxed whitespace-pre-line">{quote.text}</p>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Empty description="暂无思想金句" />
        )}
      </Card>

      <Card
        title={(
          <span>
            <InfoCircleOutlined className="mr-2" />
            内容信息
          </span>
        )}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl bg-bg-secondary px-4 py-3">
            <div className="text-text-tertiary mb-1">内容来源</div>
            <div className="text-text-primary">{formatSourceType(content.source_type)}</div>
          </div>
          <div className="rounded-xl bg-bg-secondary px-4 py-3">
            <div className="text-text-tertiary mb-1">内容日期</div>
            <div className="text-text-primary">{formatDate(content.content_date)}</div>
          </div>
          <div className="rounded-xl bg-bg-secondary px-4 py-3">
            <div className="text-text-tertiary mb-1">处理状态</div>
            <div className="text-text-primary">{formatStatus(content.status)}</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MeetingDetail;
