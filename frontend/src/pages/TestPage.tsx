// Simple test page without any data fetching
export default function TestPage() {
  console.log('TestPage rendering');
  return (
    <div style={{ padding: '20px', background: '#f4ede4', minHeight: '100vh' }}>
      <h1 style={{ color: '#c8734f', fontSize: '24px', fontWeight: 'bold' }}>
        测试页面 - Test Page
      </h1>
      <p style={{ marginTop: '20px', color: '#31291f' }}>
        如果你能看到这个页面，说明路由工作正常！
      </p>
      <div style={{ marginTop: '20px', padding: '20px', background: '#fff', borderRadius: '8px' }}>
        <p>当前路径: {window.location.pathname}</p>
      </div>
    </div>
  );
}
