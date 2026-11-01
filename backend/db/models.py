from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Float, UniqueConstraint, ForeignKey, JSON,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


def _now():
    return datetime.utcnow()


class Run(Base):
    __tablename__ = "runs"
    id = Column(Integer, primary_key=True)
    topic = Column(Text, nullable=False)
    domain = Column(String(64))
    question = Column(Text)
    created_at = Column(DateTime, default=_now)
    status = Column(String(32), default="queued")

    sources = relationship("Source", back_populates="run", cascade="all, delete-orphan")
    slots = relationship("Slot", back_populates="run", cascade="all, delete-orphan")
    claims = relationship("Claim", back_populates="run", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="run", cascade="all, delete-orphan")
    checklist_items = relationship("ChecklistItem", back_populates="run", cascade="all, delete-orphan")
    run_events = relationship("RunEvent", back_populates="run", cascade="all, delete-orphan")


class Source(Base):
    __tablename__ = "sources"
    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False)
    url = Column(Text)
    title = Column(Text)
    fetched_at = Column(DateTime, default=_now)
    page_date = Column(String(64))
    tier = Column(String(32))
    text = Column(Text)
    active = Column(Boolean, default=True)

    run = relationship("Run", back_populates="sources")


class Slot(Base):
    __tablename__ = "slots"
    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False)
    key = Column(String(64), nullable=False)
    label = Column(String(128))
    definition = Column(Text)
    is_core = Column(Boolean, default=False)

    run = relationship("Run", back_populates="slots")


class Claim(Base):
    __tablename__ = "claims"
    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False)
    source_id = Column(Integer, ForeignKey("sources.id"))
    quote = Column(Text, nullable=False)
    span_start = Column(Integer)
    span_end = Column(Integer)
    slot_id = Column(Integer, ForeignKey("slots.id"))
    normalized_value_json = Column(JSON)
    type = Column(String(32))
    claim_date = Column(String(64))

    run = relationship("Run", back_populates="claims")


class Finding(Base):
    __tablename__ = "findings"
    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("slots.id"))
    kind = Column(String(16))  # GAP|CONFLICT|STALE|SYSTEM
    state = Column(String(64))  # 5 evidential states + system states
    detail_json = Column(JSON)

    run = relationship("Run", back_populates="findings")
    evidence = relationship("Evidence", back_populates="finding", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"
    id = Column(Integer, primary_key=True)
    finding_id = Column(Integer, ForeignKey("findings.id"), nullable=False)
    source_id = Column(Integer, ForeignKey("sources.id"))
    quote = Column(Text)
    span_start = Column(Integer)
    span_end = Column(Integer)

    finding = relationship("Finding", back_populates="evidence")


class ChecklistItem(Base):
    __tablename__ = "checklist_items"
    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False)
    finding_id = Column(Integer, ForeignKey("findings.id"))
    prompt = Column(Text)
    target_hint = Column(Text)
    done = Column(Boolean, default=False)

    run = relationship("Run", back_populates="checklist_items")


class RunEvent(Base):
    __tablename__ = "run_events"
    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False)
    seq = Column(Integer, nullable=False)
    ts = Column(DateTime, default=_now)
    type = Column(String(64), nullable=False)
    payload_json = Column(JSON)

    run = relationship("Run", back_populates="run_events")
    __table_args__ = (UniqueConstraint("run_id", "seq", name="uq_run_seq"),)


class NliVerdictCache(Base):
    __tablename__ = "nli_verdict_cache"
    id = Column(Integer, primary_key=True)
    pair_hash = Column(String(64), unique=True, nullable=False)
    label = Column(String(32))
    score = Column(Float)
    model = Column(String(64))
    created_at = Column(DateTime, default=_now)


class ScannerReport(Base):
    __tablename__ = "scanner_reports"
    id = Column(Integer, primary_key=True)
    url = Column(Text, nullable=False)
    created_at = Column(DateTime, default=_now)
    status = Column(String(32), default="queued")


class ScannerFinding(Base):
    __tablename__ = "scanner_findings"
    id = Column(Integer, primary_key=True)
    report_id = Column(Integer, ForeignKey("scanner_reports.id"), nullable=False)
    claim = Column(Text)
    quote = Column(Text)
    span_start = Column(Integer)
    span_end = Column(Integer)
    stance = Column(String(32))  # REFUTED|UNSUPPORTED|UNDATED|CORROBORATED
    evidence_json = Column(JSON)
