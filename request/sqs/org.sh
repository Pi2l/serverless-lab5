

# usege: org create [org body as json]
function org() {
    local operation=$1
    local org_body=$2

    if [[ -z "$org_body" ]]; then
        org_body='{ "orgId": "2ad9addf-767d-4021-8740-6253d2f7e0fb", "name": "New Organization", "description": "This is a new organization created via API."}'
    fi

    case $operation in
        create)
            if [ -z "$org_body" ]; then
                echo "Error: Organization body is required."
                return 1
            fi
            echo "Creating organization with body: $org_body"

            AWS_ACCESS_KEY_ID=root AWS_SECRET_ACCESS_KEY=root \
            aws --endpoint-url=http://localhost:9324 sqs send-message \
                --queue-url http://localhost:9324/queue/OrganizationQueue \
                --message-body '{ "eventType": "create", "body": '"$org_body"' }' \
                --region us-east-1
            ;;
        update)
            if [ -z "$org_body" ]; then
                echo "Error: Organization body is required."
                return 1
            fi
            echo "Updating organization with body: $org_body"

            AWS_ACCESS_KEY_ID=root AWS_SECRET_ACCESS_KEY=root \
            aws --endpoint-url=http://localhost:9324 sqs send-message \
                --queue-url http://localhost:9324/queue/OrganizationQueue \
                --message-body '{ "eventType": "update", "body": '"$org_body"' }' \
                --region us-east-1
            ;;
    esac
}

org "$@"