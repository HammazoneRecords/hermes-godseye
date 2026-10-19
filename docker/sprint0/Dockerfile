FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive HERMES_HOME=/opt/hermes-home
RUN apt-get update -q && apt-get install -y -q \
    git python3 python3-pip python3-venv curl ca-certificates \
    sqlite3 jq nodejs npm \
    && rm -rf /var/lib/apt/lists/*
RUN git config --global user.email sprint0@local && git config --global user.name "Sprint 0 Bot" \
    && git config --global --add safe.directory '*'
WORKDIR /work
# Sprint 0 script is mounted at /work/sprint0.sh
CMD ["bash", "/work/sprint0.sh"]
