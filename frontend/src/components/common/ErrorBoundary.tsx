import React from 'react';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundaryInner extends React.Component<
  Props & { navigate: ReturnType<typeof useNavigate> },
  State
> {
  constructor(props: Props & { navigate: ReturnType<typeof useNavigate> }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to error tracking service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.navigate('/');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Result
          status="error"
          title="页面出错了"
          subTitle={
            this.state.error?.message ||
            '抱歉，页面遇到了一些问题。请尝试刷新页面或返回首页。'
          }
          extra={[
            <Button type="primary" key="home" onClick={this.handleGoHome}>
              返回首页
            </Button>,
            <Button key="retry" onClick={this.handleReset}>
              重试
            </Button>,
          ]}
        />
      );
    }

    return this.props.children;
  }
}

// Wrapper component to provide navigate function
export const ErrorBoundary: React.FC<Props> = ({ children, fallback, onReset }) => {
  const navigate = useNavigate();
  return (
    <ErrorBoundaryInner navigate={navigate} fallback={fallback} onReset={onReset}>
      {children}
    </ErrorBoundaryInner>
  );
};

export default ErrorBoundary;
