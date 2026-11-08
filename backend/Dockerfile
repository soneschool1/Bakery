# ==========================================
# Build Stage
# ==========================================
FROM golang:alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o harbuu-backend main.go

# ==========================================
# Production Runtime Stage
# ==========================================
FROM alpine:3.21

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata wget

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/harbuu-backend /app/harbuu-backend
RUN chmod +x /app/harbuu-backend

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O - http://localhost:8080/api/health || exit 1

ENTRYPOINT ["/app/harbuu-backend"]
