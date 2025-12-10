export default function AuthCard({ title, subtitle, children, footer }){
  return (
    <div className="container center">
      <div className="card" style={{width: 420, maxWidth: '95%'}}>
        <h1 className="h1">{title}</h1>
        {subtitle && <p className="h2">{subtitle}</p>}
        <div className="spacer" />
        {children}
        {footer && <div style={{marginTop:14}} className="note">{footer}</div>}
      </div>
    </div>
  );
}
