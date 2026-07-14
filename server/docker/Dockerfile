# Multi-stage build (blueprint §19.1): SDK build → small, non-root chiseled runtime.
# Build context is the server/ directory: docker build -f docker/Dockerfile .

# ---- build ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY *.sln Directory.Build.props Directory.Packages.props ./
COPY src/ src/
RUN dotnet restore src/AiWorkflow.Api/AiWorkflow.Api.csproj
RUN dotnet publish src/AiWorkflow.Api/AiWorkflow.Api.csproj -c Release -o /app /p:UseAppHost=false

# ---- runtime (small, non-root) ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled AS final
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080 ASPNETCORE_ENVIRONMENT=Production
USER $APP_UID
ENTRYPOINT ["dotnet", "AiWorkflow.Api.dll"]
